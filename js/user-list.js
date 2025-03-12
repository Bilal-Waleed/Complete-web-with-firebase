import { 
    auth, db, signOut, onAuthStateChanged, doc, getDoc, collection, getDocs, query, where, addDoc, deleteDoc, onSnapshot
} from "../js/firebase.js";

document.addEventListener("DOMContentLoaded", async function () {
    const usersContainer = document.querySelector("#users-container");
    const userProfileContainer = document.querySelector("#user-profile-container");
    const searchInput = document.querySelector("#searchInput");
    const searchBtn = document.querySelector("#searchBtn");
    const storedUID = localStorage.getItem("userUID");
    const friendsBtn = document.querySelector(".friends-btn");
        if (friendsBtn) {
            friendsBtn.addEventListener("click", toggleUserList);
        }

    let allUsers = []; // ✅ Store all users globally
    let friendsList = []; // ✅ Store friends list globally


    // ✅ Redirect If User Is Not Logged In
    onAuthStateChanged(auth, async (user) => {
        if (!user || !storedUID || user.uid !== storedUID) {
            window.location.href = "login-signup.html";
            return;
        }

        // ✅ Load User Profile
        const userDocRef = doc(db, "users", storedUID);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            displayUserProfile(userDocSnap.data());
        }

        if (usersContainer) {
            await fetchAllUsers();
        }
        listenForFriendUpdates();
    });


    // ✅ Display User Profile with Notification Icon
    function displayUserProfile(userData) {
        const username = userData.username || "User";
        const profilePic = userData.profilePic || "";

        let avatarHTML = profilePic
            ? `<img src="${profilePic}" alt="Profile Picture" class="profile-avatar">`
            : `<div class="profile-avatar">${username.charAt(0).toUpperCase()}</div>`;

        userProfileContainer.innerHTML = `
            <div class="profile-details">
                <div class="profile-clickable">
                    ${avatarHTML}
                    <span class="profile-name">${username}</span>
                </div>
            </div>
            <div class="notification-icon">
                <i class="fas fa-bell"></i>
                <span class="notification-badge" id="notificationBadge"></span>
            </div>
        `;

        document.querySelector(".profile-clickable").addEventListener("click", () => {
            window.location.href = `profile.html?uid=${storedUID}`;
        });

        document.querySelector(".notification-icon").addEventListener("click", openNotifications);
    }

    async function fetchFriends() {
        if (!storedUID) return;
    
        try {
            const friendsRef = collection(db, "friends");
            const q1 = query(friendsRef, where("user1", "==", storedUID));
            const q2 = query(friendsRef, where("user2", "==", storedUID));
    
            const friendsSnapshot1 = await getDocs(q1);
            const friendsSnapshot2 = await getDocs(q2);
    
            let friendUIDs = new Set();
    
            friendsSnapshot1.forEach(docSnap => friendUIDs.add(docSnap.data().user2));
            friendsSnapshot2.forEach(docSnap => friendUIDs.add(docSnap.data().user1));
    
            friendsList = []; // ✅ Friends list globally store karein
            for (let friendUID of friendUIDs) {
                const userDocRef = doc(db, "users", friendUID);
                const userDocSnap = await getDoc(userDocRef);
    
                if (userDocSnap.exists()) {
                    friendsList.push({ ...userDocSnap.data(), uid: friendUID });
                }
            }
    
            displayUsers(friendsList); // ✅ Sirf Friends dikhayein
        } catch (error) {
            console.error("Error fetching friends:", error);
        }
    }        
    

    // ✅ Fetch All Users (Excluding Logged-in User)
    async function fetchAllUsers() {
        if (!storedUID) return;

        try {
            const usersQuery = collection(db, "users");
            const usersSnapshot = await getDocs(usersQuery);

            allUsers = []; // ✅ Clear previous list
            usersSnapshot.forEach((docSnap) => {
                if (docSnap.id !== storedUID) { // ✅ Exclude logged-in user
                    allUsers.push({ ...docSnap.data(), uid: docSnap.id });
                }
            });

            displayUsers(allUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }

    let showingFriends = false; // ✅ Initially All Users dikh rahe hain

    function toggleUserList() {
        showingFriends = !showingFriends; // ✅ Toggle State
    
        if (showingFriends) {
            fetchFriends(); // ✅ Sirf Friends Fetch karein
            friendsBtn.innerHTML = `<i class="fas fa-users"></i> All Users`; // ✅ Text Update
        } else {
            displayUsers(allUsers); // ✅ Saare Users Wapas Show karein
            friendsBtn.innerHTML = `<i class="fas fa-user-friends"></i> Friends`; // ✅ Text Update
        }
    
        searchUsers(); // ✅ Search bar ke results ko bhi update karein
    }
    


    async function displayUsers(usersList) {
        usersContainer.innerHTML = ""; // ✅ Purana Data Clear
    
        if (usersList.length === 0) {
            usersContainer.innerHTML = `<div class="no-user-found">No users found.</div>`;
            return;
        }
    
        for (const userData of usersList) {
            const userCard = document.createElement("div");
            userCard.classList.add("user-card");
    
            let avatarHTML = userData.profilePic
                ? `<img src="${userData.profilePic}" class="profile-circle">`
                : `<div class="profile-circle">${userData.username.charAt(0).toUpperCase()}</div>`;
    
            let buttonHTML = `<button class="follow-btn" data-user-id="${userData.uid}">Loading...</button>`;
    
            userCard.innerHTML = `
                ${avatarHTML}
                <p class="user-name"><strong>${userData.username}</strong></p>
                ${buttonHTML}
            `;
    
            usersContainer.appendChild(userCard);
    
            // ✅ Sirf specific user ka follow button update karein
            updateFollowButton(userData.uid, userCard.querySelector(".follow-btn"));
        }
    }
    
    

    async function updateFollowButton(userId, buttonElement) {
        if (!storedUID) return;
    
        try {
            const friendsRef = collection(db, "friends");
            const q1 = query(friendsRef, where("user1", "==", storedUID), where("user2", "==", userId));
            const q2 = query(friendsRef, where("user1", "==", userId), where("user2", "==", storedUID));
    
            const querySnapshot1 = await getDocs(q1);
            const querySnapshot2 = await getDocs(q2);
    
            if (!querySnapshot1.empty || !querySnapshot2.empty) {
                buttonElement.textContent = "Friend";
                buttonElement.style.background = "#28a745";
            } else {
                buttonElement.textContent = "Follow";
                buttonElement.style.background = "linear-gradient(45deg, #007bff, #00c6ff)";
            }
        } catch (error) {
            console.error("Error updating follow button:", error);
        }
    }
    
    

    async function toggleFollow(event) {
        const followBtn = event.target;
        const userId = followBtn.getAttribute("data-user-id");
    
        if (!storedUID) {
            alert("Please log in first.");
            return;
        }
    
        if (followBtn.textContent === "Friend") {
            // ✅ Friend ko unfriend karein
            await removeFriend(userId);
            followBtn.textContent = "Follow";
            followBtn.style.background = "linear-gradient(45deg, #007bff, #00c6ff)";
            return;
        }
    
        const requestRef = collection(db, "friend_requests");
        const q = query(requestRef, where("sender", "==", storedUID), where("receiver", "==", userId));
        const querySnapshot = await getDocs(q);
    
        if (!querySnapshot.empty) {
            // ✅ Request Cancel Karein
            querySnapshot.forEach(async (docSnap) => {
                await deleteDoc(doc(db, "friend_requests", docSnap.id));
            });
            followBtn.textContent = "Follow";
            followBtn.style.background = "linear-gradient(45deg, #007bff, #00c6ff)";
        } else {
            // ✅ Request Send Karein
            await addDoc(requestRef, {
                sender: storedUID,
                receiver: userId,
                status: "pending",
                timestamp: new Date()
            });
            followBtn.textContent = "Cancel";
            followBtn.style.background = "gray";
        }
    }
    

    async function removeFriend(userId) {
        if (!storedUID) return;
    
        const friendsRef = collection(db, "friends");
        const q1 = query(friendsRef, where("user1", "==", storedUID), where("user2", "==", userId));
        const q2 = query(friendsRef, where("user1", "==", userId), where("user2", "==", storedUID));
    
        const querySnapshot1 = await getDocs(q1);
        const querySnapshot2 = await getDocs(q2);
    
        // ✅ Firestore se remove karein
        querySnapshot1.forEach(async (docSnap) => {
            await deleteDoc(doc(db, "friends", docSnap.id));
        });
    
        querySnapshot2.forEach(async (docSnap) => {
            await deleteDoc(doc(db, "friends", docSnap.id));
        });
    
        // ✅ UI se bhi remove karein (Sirf Friends List me)
        if (showingFriends) {
            document.querySelector(`[data-user-id="${userId}"]`).closest(".user-card").remove();
        } else {
            resetFollowButtonUI(userId);
        }
    }

    function resetFollowButtonUI(userId) {
        document.querySelectorAll(`[data-user-id="${userId}"]`).forEach(btn => {
            btn.textContent = "Follow";
            btn.style.background = "linear-gradient(45deg, #007bff, #00c6ff)";
        });
    }
    
    
    

    document.addEventListener("click", function (event) {
        if (event.target.classList.contains("follow-btn")) {
            const userId = event.target.getAttribute("data-user-id");
    
            if (showingFriends) {
                removeFriend(userId); // ✅ Agar "Friends" list me hai to remove karein
            } else {
                toggleFollow(event); // ✅ Agar "All Users" list me hai to Follow system chale
            }
        }
    });
    

    function searchUsers() {
        const searchText = searchInput.value.toLowerCase().trim();
    
        let filteredUsers;
    
        if (showingFriends) {
            filteredUsers = friendsList.filter(user => 
                user.username.toLowerCase().includes(searchText)
            );
        } else {
            filteredUsers = allUsers.filter(user => 
                user.username.toLowerCase().includes(searchText)
            );
        }
    
        displayUsers(filteredUsers);
    }
    

    searchInput.addEventListener("input", searchUsers);
    searchBtn.addEventListener("click", searchUsers);
});

function listenForFriendUpdates() {
    const friendsRef = collection(db, "friends");

    onSnapshot(friendsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const { user1, user2 } = change.doc.data();

            if (change.type === "added") {
                updateSpecificFollowButton(user1);
                updateSpecificFollowButton(user2);
            } 
            else if (change.type === "removed") {
                resetSpecificFollowButtonUI(user1);
                resetSpecificFollowButtonUI(user2);
            }
        });
    });
}

// ✅ Update only specific user's button
function updateSpecificFollowButton(userId) {
    document.querySelectorAll(`[data-user-id="${userId}"]`).forEach(btn => {
        btn.textContent = "Friend";
        btn.style.background = "#28a745";
    });
}

// ✅ Reset only specific user's button
function resetSpecificFollowButtonUI(userId) {
    document.querySelectorAll(`[data-user-id="${userId}"]`).forEach(btn => {
        btn.textContent = "Follow";
        btn.style.background = "linear-gradient(45deg, #007bff, #00c6ff)";
    });
}

function openNotifications() {
    window.location.href = "notifications.html";
}

function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("open");
}
window.toggleSidebar = toggleSidebar;


