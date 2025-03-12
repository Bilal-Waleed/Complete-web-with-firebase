import { auth, db, collection, query, where, onSnapshot, addDoc, serverTimestamp, onAuthStateChanged, orderBy, deleteDoc, doc, updateDoc } from "../js/firebase.js";

const userList = document.getElementById('userList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatWithUser = document.getElementById('chatWithUser');

let currentUser = null;
let selectedUserId = null;
let unsubscribeMessages = null; // To store the unsubscribe function for the messages listener
let editingMessageId = null; // To track the message being edited

// Toggle sidebar on mobile
const menuButton = document.getElementById('menuButton');
menuButton.addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('active');
});

// Redirect to dash-post.html when the back button is clicked
const backButton = document.getElementById('backButton');
backButton.addEventListener('click', () => {
  window.location.href = 'dash-post.html'; // Redirect to dash-post.html
});

// Fetch and display users
function fetchUsers() {
  const usersRef = collection(db, 'users');
  onSnapshot(usersRef, (snapshot) => {
    userList.innerHTML = '';
    snapshot.forEach((doc) => {
      const user = doc.data();
      if (user.uid !== auth.currentUser.uid) {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';

        // Avatar logic: Use profilePic if available, otherwise use the first letter of the username
        const avatarContent = user.profilePic
          ? `<img src="${user.profilePic}" alt="${user.username}" class="user-avatar" />`
          : `<div class="user-avatar fallback-avatar">${user.username.charAt(0).toUpperCase()}</div>`;

        userElement.innerHTML = `
          ${avatarContent}
          <span class="user-name">${user.username}</span>
        `;
        userElement.addEventListener('click', () => selectUser(user));
        userList.appendChild(userElement);
      }
    });
  }, (error) => {
    console.error("Error fetching users: ", error);
  });
}

// Select a user to chat with
function selectUser(user) {
  selectedUserId = user.uid;
  chatWithUser.textContent = `Chat with ${user.username}`;

  // Unsubscribe from the previous messages listener (if any)
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  fetchMessages();
}

// Fetch and display messages
function fetchMessages() {
  chatMessages.innerHTML = '';
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('users', 'array-contains', auth.currentUser.uid),
    orderBy('timestamp', 'asc') // Order messages by timestamp in ascending order
  );

  // Attach a new listener and store the unsubscribe function
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = ''; // Clear previous messages
    snapshot.forEach((doc) => {
      const message = doc.data();
      if (message.users.includes(selectedUserId)) {
        const messageElement = document.createElement('div');
        messageElement.className = message.sender === auth.currentUser.uid ? 'message sent' : 'message received';

        // Format the timestamp
        const timestamp = message.timestamp?.toDate().toLocaleString() || 'Just now';

        // Add delete and edit icons (only for the current user's messages)
        const actions = message.sender === auth.currentUser.uid
          ? `<div class="message-actions">
               <i class="fas fa-edit edit-icon" data-id="${doc.id}"></i>
               <i class="fas fa-trash delete-icon" data-id="${doc.id}"></i>
             </div>`
          : '';

        messageElement.innerHTML = `
          <div class="message-text">${message.text}</div>
          <div class="message-timestamp">${timestamp}</div>
          ${actions}
        `;
        chatMessages.appendChild(messageElement);
      }
    });
    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, (error) => {
    console.error("Error fetching messages: ", error);
  });
}

// Send a message
function sendMessage() {
  const text = messageInput.value.trim();
  if (text && selectedUserId) {
    if (editingMessageId) {
      // If editing, update the existing message
      editMessage(editingMessageId, text);
      editingMessageId = null; // Reset editing state
      sendButton.textContent = 'Send'; // Change button text back to "Send"
    } else {
      // If not editing, send a new message
      addDoc(collection(db, 'messages'), {
        text,
        sender: auth.currentUser.uid,
        users: [auth.currentUser.uid, selectedUserId],
        timestamp: serverTimestamp() // Add a timestamp to the message
      });
    }
    messageInput.value = ''; // Clear input after sending
  }
}

// Delete a message
function deleteMessage(messageId) {
  const messageRef = doc(db, 'messages', messageId);
  deleteDoc(messageRef).catch((error) => {
    console.error("Error deleting message: ", error);
  });
}

// Edit a message
function editMessage(messageId, newText) {
  const messageRef = doc(db, 'messages', messageId);
  updateDoc(messageRef, {
    text: newText
  }).catch((error) => {
    console.error("Error editing message: ", error);
  });
}

// Attach event listener for sending messages
sendButton.addEventListener('click', sendMessage);

// Handle Enter key press in the message input field
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault(); // Prevent default behavior (e.g., new line)
    sendMessage(); // Send or edit the message
  }
});

// Toggle sidebar on mobile
backButton.addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('active');
});

// Handle click events for delete and edit icons
chatMessages.addEventListener('click', (event) => {
  if (event.target.classList.contains('delete-icon')) {
    const messageId = event.target.getAttribute('data-id');
    deleteMessage(messageId);
  } else if (event.target.classList.contains('edit-icon')) {
    const messageId = event.target.getAttribute('data-id');
    const messageText = event.target.closest('.message').querySelector('.message-text').textContent;
    messageInput.value = messageText; // Populate input field with message text
    editingMessageId = messageId; // Set the message ID being edited
    sendButton.textContent = 'Save'; // Change button text to "Save"
  }
});

// Initialize
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    fetchUsers();
  } else {
    window.location.href = 'login-signup.html'; 
  }
});