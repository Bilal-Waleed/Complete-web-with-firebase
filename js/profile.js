// ✅ Firebase Imports
import { auth, db, signOut, doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, onSnapshot  } from "../js/firebase.js";


let storedUID = null;
document.addEventListener("DOMContentLoaded", async function () {
    await displayUserProfile();
    await fetchFriendsCount(); 
    listenForFriendUpdates(); 
    const profileAvatar = document.querySelector("#profile-avatar");
    const profileUsername = document.querySelector("#profile-username");
    const profileBio = document.querySelector("#profile-bio");
    const userPostsContainer = document.querySelector("#user-posts-container");

    // ✅ Get User UID from URL (or fallback to Local Storage)
    const urlParams = new URLSearchParams(window.location.search);
    let storedUID = urlParams.get("uid") || localStorage.getItem("userUID");

    if (!storedUID) {
        console.log("Unauthorized access! Redirecting...");
        window.location.href = "login-signup.html";
        return;
    }

    // ✅ Fetch User Data
    const userDocRef = doc(db, "users", storedUID);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        var userData = userDocSnap.data(); // ✅ Declare userData globally inside this function
        profileUsername.textContent = userData.username || "Unknown User";
        profileBio.textContent = userData.bio || "No bio available";

        // ✅ If no profile picture, use first letter avatar
        let avatarHTML = userData.profilePic
            ? `<img src="${userData.profilePic}" alt="Profile Picture">`
            : `<div class="avatar">${userData.username.charAt(0).toUpperCase()}</div>`;

        profileAvatar.innerHTML = avatarHTML;
    } else {
        alert("User not found in database.");
        window.location.href = "dashboard.html";
        return;
    }

    async function displayUserProfile() {
        const userProfileContainer = document.querySelector("#user-profile-container");
        const storedUID = localStorage.getItem("userUID");
    
        if (!storedUID) {
            console.log("Unauthorized access! Redirecting...");
            window.location.href = "login-signup.html";
            return;
        }
    
        // ✅ Firestore se user ka data fetch karna
        const userDocRef = doc(db, "users", storedUID);
        const userDocSnap = await getDoc(userDocRef);
    
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const username = userData.username || "User";
            const profilePic = userData.profilePic || "";
            const bio = userData.bio || "No bio available";
    
            let avatarHTML = profilePic
                ? `<img src="${profilePic}" class="profile-avatar">`
                : `<div class="profile-avatar">${username.charAt(0).toUpperCase()}</div>`;
    
            // ✅ Profile container update karein
            userProfileContainer.innerHTML = `
                <div class="profile-card">
                    <div id="profile-avatar">${avatarHTML}</div>
                    <div class="profile-info">
                        <h2 id="profile-username">${username}</h2>
                        <p id="profile-bio">${bio}</p>
                        <button id="edit-profile">Edit Profile</button>
                    </div>
                    <div class="profile-stats">
                        <p>Posts: <span id="post-count" class="count">0</span></p>
                        <p>Friends: <span id="friend-count" class="count">0</span></p>
                    </div>
                </div>
            `;
    
            // ✅ Edit Profile Button Click Event
            document.querySelector("#edit-profile").addEventListener("click", () => {
                window.location.href = `edit-profile.html?uid=${storedUID}`;
            });
    
            // ✅ Fetch Post & Friend Count
            await fetchUserStats();
        } else {
            console.log("User data not found!");
            window.location.href = "login-signup.html";
        }
    }

    async function fetchFriendsCount() {
        const storedUID = localStorage.getItem("userUID");
        if (!storedUID) return;
    
        const friendsRef = collection(db, "friends");
    
        // ✅ Query to count both `user1` and `user2`
        const friendsQuery1 = query(friendsRef, where("user1", "==", storedUID));
        const friendsQuery2 = query(friendsRef, where("user2", "==", storedUID));
    
        // ✅ Get both queries data
        const friendsSnapshot1 = await getDocs(friendsQuery1);
        const friendsSnapshot2 = await getDocs(friendsQuery2);
    
        // ✅ Total Friends Count
        const totalFriends = friendsSnapshot1.size + friendsSnapshot2.size;
    
        // ✅ Update UI
        const friendCountElement = document.querySelector("#friend-count");
        if (friendCountElement) {
            friendCountElement.textContent = totalFriends; // ✅ Show Correct Friend Count
        }
    }
    

    function listenForFriendUpdates() {
        const storedUID = localStorage.getItem("userUID");
        if (!storedUID) return;
    
        const friendsRef = collection(db, "friends");
    
        // ✅ Query for both `user1` and `user2`
        const friendsQuery1 = query(friendsRef, where("user1", "==", storedUID));
        const friendsQuery2 = query(friendsRef, where("user2", "==", storedUID));
    
        // ✅ Listen for real-time updates
        onSnapshot(friendsQuery1, (snapshot1) => {
            onSnapshot(friendsQuery2, (snapshot2) => {
                const totalFriends = snapshot1.size + snapshot2.size;
                
                // ✅ Update UI
                const friendCountElement = document.querySelector("#friend-count");
                if (friendCountElement) {
                    friendCountElement.textContent = totalFriends;
                }
            });
        });
    }
    


    async function fetchUserStats() {
        const postCountElement = document.querySelector("#post-count");
        const friendCountElement = document.querySelector("#friend-count");
    
        // ✅ Firestore se posts ka count lena
        const postsQuery = query(collection(db, "posts"), where("uid", "==", localStorage.getItem("userUID")));
        const postsSnapshot = await getDocs(postsQuery);
        postCountElement.textContent = postsSnapshot.size; // ✅ UI me count update karein
    
    }
    
    async function updateUserStats() {
        await fetchUserStats(); // ✅ Fetch latest counts and update UI
    }

        // ✅ Listen for New Friends
    document.getElementById("addFriendBtn")?.addEventListener("click", async function () {
        await new Promise(resolve => setTimeout(resolve, 2000)); // ✅ Wait for Firestore Update
        fetchFriendsCount(); // ✅ Update UI with new friend count
    });

    // ✅ Listen for Removed Friends
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-friend")) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // ✅ Wait for Firestore Update
            fetchFriendsCount(); // ✅ Update UI with new friend count
        }
    });

    
    // ✅ Listen for New Posts
    document.getElementById("submitPost").addEventListener("click", async function () {
        await new Promise(resolve => setTimeout(resolve, 2000)); // ✅ Wait for Firestore Update
        updateUserStats(); // ✅ Update UI with new post count
    });
    
    // ✅ Listen for Deleted Posts
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-post")) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // ✅ Wait for Firestore Update
            updateUserStats(); // ✅ Update UI with new post count
        }
    });
    
    // ✅ Listen for New Friends
    document.getElementById("addFriendBtn")?.addEventListener("click", async function () {
        await new Promise(resolve => setTimeout(resolve, 2000)); // ✅ Wait for Firestore Update
        updateUserStats(); // ✅ Update UI with new friend count
    });
    
    // ✅ Listen for Removed Friends
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-friend")) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // ✅ Wait for Firestore Update
            updateUserStats(); // ✅ Update UI with new friend count
        }
    });
    

    // ✅ Fetch User's Posts
    const postsQuery = query(collection(db, "posts"), where("uid", "==", storedUID));
    const querySnapshot = await getDocs(postsQuery);

    userPostsContainer.innerHTML = ""; // Clear previous content

    if (querySnapshot.empty) {
        userPostsContainer.innerHTML = "<p>No posts found.</p>";
    } else {
        for (const docSnap of querySnapshot.docs) {
            const postData = docSnap.data();
            const postId = docSnap.id; // ✅ Get post ID

            let username = userData.username || "Unknown"; // ✅ Using userData from earlier
            let profilePic = userData.profilePic || "";

            let avatarHTML = profilePic
                ? `<img src="${profilePic}" alt="Profile Picture" class="avatar">`
                : `<div class="avatar">${username.charAt(0).toUpperCase()}</div>`;

                let postDate = "Unknown time";
                if (postData.updatedAt) {
                    postDate = new Date(postData.updatedAt.seconds * 1000).toLocaleString() + " (Edited)";
                } else if (postData.createdAt) {
                    postDate = new Date(postData.createdAt.seconds * 1000).toLocaleString();
                }
                

            // ✅ Fetch Comment Count for this Post
            const commentsQuery = query(collection(db, "comments"), where("postId", "==", postId));
            const commentsSnapshot = await getDocs(commentsQuery);
            const commentCount = commentsSnapshot.size; // ✅ Get the actual count

            // ✅ Create Post Element with Updated Comment Count & Three-Dot Menu
            const postElement = document.createElement("div");
            postElement.classList.add("post");
            postElement.innerHTML = `
                <div class="post-header">
                    ${avatarHTML}
                    <div class="post-user">
                        <strong>${username}</strong>
                        <span class="post-time">${postDate}</span>
                    </div>
                    <!-- ✅ Three Dot Menu (Fixed) -->
                    <div class="post-three-dot-menu">
                        <button class="three-dot-menu-btn" data-post-id="${postId}">⋮</button>
                        <div class="three-dot-menu-dropdown">
                            <button class="edit-post" data-post-id="${postId}">Edit</button>
                            <button class="delete-post" data-post-id="${postId}">Delete</button>
                        </div>
                    </div>
                </div>
                <p class="post-content">${postData.content}</p>
                <div class="post-actions">
                    <button class="like-btn" data-post-id="${postId}">
                        <i class="fas fa-thumbs-up"></i> <span class="like-count">${postData.likes?.length || 0}</span>
                    </button>
                    <button class="comment-btn" data-post-id="${postId}">
                        <i class="fas fa-comment"></i> <span class="comment-count">${commentCount}</span>
                    </button>
                </div>
            `;
            userPostsContainer.appendChild(postElement);
        }
    }


    document.addEventListener("click", (e) => {
        // ✅ Three-Dot Button Click Handling
        if (e.target.classList.contains("three-dot-menu-btn")) {
            let menuDropdown = e.target.nextElementSibling;
            
            // ✅ Pehle sabhi open dropdowns ko close karo
            document.querySelectorAll(".three-dot-menu-dropdown").forEach(menu => {
                if (menu !== menuDropdown) {
                    menu.classList.remove("show");
                }
            });
    
            // ✅ Current clicked dropdown toggle karo
            menuDropdown.classList.toggle("show");
    
            // ✅ Prevent event bubbling taake body click se na band ho
            e.stopPropagation();
        } 
        // ✅ Close menu if clicked outside
        else {
            document.querySelectorAll(".three-dot-menu-dropdown").forEach(menu => {
                menu.classList.remove("show");
            });
        }
    });

    // ✅ Show Success Modal Function
    function showSuccessModal(message) {
        const successOverlay = document.getElementById("successOverlay");
        const successModal = document.getElementById("successModal");
        const successMessage = document.getElementById("successMessage");

        successMessage.textContent = message; // ✅ Set message dynamically
        successOverlay.style.display = "block";
        successModal.style.display = "block";

        setTimeout(() => {
            successOverlay.style.display = "none";
            successModal.style.display = "none";
        }, 2000);
    }

    // ✅ Modal Open & Close Functionality
    const createPostBtn = document.getElementById("create-post-btn");
    const postModal = document.getElementById("postModal");
    const postOverlay = document.getElementById("postOverlay");
    const closeModal = document.getElementById("closeModal");

    createPostBtn.addEventListener("click", () => {
        postModal.style.display = "block";
        postOverlay.style.display = "block";
    });

    closeModal.addEventListener("click", () => {
        postModal.style.display = "none";
        postOverlay.style.display = "none";
    });

    postOverlay.addEventListener("click", () => {
        postModal.style.display = "none";
        postOverlay.style.display = "none";
    });


        // ✅ Create Post Functionality (Fix for Multiple Posts)
    document.getElementById("submitPost").addEventListener("click", async function () {
        const postContent = document.getElementById("postContent").value.trim();
        const submitBtn = document.getElementById("submitPost");

        if (postContent === "") {
            alert("Post content cannot be empty.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Posting..."; // ✅ UI Feedback

        try {
            await addDoc(collection(db, "posts"), {
                uid: localStorage.getItem("userUID"),
                content: postContent,
                createdAt: new Date()
            });

            // ✅ Show Success Modal Instead of Alert
            showSuccessModal("Post Created Successfully!");

            postModal.style.display = "none";
            postOverlay.style.display = "none";

            setTimeout(() => location.reload(), 2000); // ✅ Refresh page after modal hides
        } catch (error) {
            alert("Error creating post: " + error.message);
        }

        submitBtn.disabled = false;
        submitBtn.innerText = "Create Post";
    });

    // ✅ Edit Post Modal Elements
    const editPostModal = document.getElementById("editPostModal");
    const editPostOverlay = document.getElementById("editPostOverlay");
    const closeEditModal = document.getElementById("closeEditModal");
    const editPostContent = document.getElementById("editPostContent");
    const submitEditPost = document.getElementById("submitEditPost");

    let editingPostId = null; // ✅ Track which post is being edited

    // ✅ Open Edit Post Modal
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("edit-post")) {
            editingPostId = e.target.getAttribute("data-post-id"); // ✅ Get post ID
            
            // ✅ Fetch Existing Post Content
            const postDocRef = doc(db, "posts", editingPostId);
            const postDocSnap = await getDoc(postDocRef);

            if (postDocSnap.exists()) {
                editPostContent.value = postDocSnap.data().content; // ✅ Load existing content
            } else {
                alert("Error: Post not found!");
                return;
            }

            // ✅ Show Edit Modal
            editPostModal.style.display = "block";
            editPostOverlay.style.display = "block";
        }
    });

    // ✅ Close Edit Modal
    closeEditModal.addEventListener("click", () => {
        editPostModal.style.display = "none";
        editPostOverlay.style.display = "none";
    });

    // ✅ Click Outside to Close Modal
    editPostOverlay.addEventListener("click", () => {
        editPostModal.style.display = "none";
        editPostOverlay.style.display = "none";
    });

    // ✅ Update Post Functionality (Prevent Multiple Clicks)
    submitEditPost.addEventListener("click", async function () {
        const updatedContent = editPostContent.value.trim();

        if (updatedContent === "") {
            alert("Post content cannot be empty.");
            return;
        }

        submitEditPost.disabled = true;
        submitEditPost.innerText = "Updating...";

        try {
            const postDocRef = doc(db, "posts", editingPostId);

            await updateDoc(postDocRef, {
                content: updatedContent,
                updatedAt: { seconds: Math.floor(Date.now() / 1000) } // ✅ Store timestamp in Firestore format
            });
            

            // ✅ Show Success Modal Instead of Alert
            showSuccessModal("Post Updated Successfully!");

            editPostModal.style.display = "none";
            editPostOverlay.style.display = "none";

            setTimeout(() => location.reload(), 2000); // ✅ Refresh page after modal hides
        } catch (error) {
            alert("Error updating post: " + error.message);
        }

        submitEditPost.disabled = false;
        submitEditPost.innerText = "Update Post";
    });

        // ✅ Delete Post Variables
    let deletePostId = null;
    const deleteOverlay = document.getElementById("deleteOverlay");
    const deleteModal = document.getElementById("deleteModal");
    const cancelDelete = document.getElementById("cancelDelete");
    const confirmDelete = document.getElementById("confirmDelete");

    // ✅ Show Delete Confirmation Modal
    function showDeleteModal(postId) {
        deletePostId = postId;
        deleteOverlay.style.display = "block";
        deleteModal.style.display = "block";
    }

    // ✅ Hide Delete Confirmation Modal
    function hideDeleteModal() {
        deleteOverlay.style.display = "none";
        deleteModal.style.display = "none";
    }

    // ✅ Cancel Delete Button Click
    cancelDelete.addEventListener("click", hideDeleteModal);
    deleteOverlay.addEventListener("click", hideDeleteModal);


        // ✅ Event Listener for Delete Post
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-post")) {
            let postId = e.target.getAttribute("data-post-id");
            showDeleteModal(postId); // ✅ Show Confirmation Modal
        }
    });

    // ✅ Confirm Delete Button Click
    confirmDelete.addEventListener("click", async () => {
        if (!deletePostId) return;

        try {
            await deleteDoc(doc(db, "posts", deletePostId));

            // ✅ Show Success Modal Instead of Alert
            showSuccessModal("Post Deleted Successfully!");

            hideDeleteModal();

            // ✅ Refresh Page After 2 Seconds
            setTimeout(() => location.reload(), 2000);
        } catch (error) {
            alert("Error deleting post: " + error.message);
        }
    });

});

document.addEventListener("click", async (e) => {
    if (e.target.closest(".like-btn")) {
        const postId = e.target.closest(".like-btn").getAttribute("data-post-id");
        const userUID = localStorage.getItem("userUID");
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) return;

        let postLikes = postSnap.data().likes || [];

        if (postLikes.includes(userUID)) {
            postLikes = postLikes.filter(uid => uid !== userUID); // ✅ Unlike
        } else {
            postLikes.push(userUID); // ✅ Like
        }

        await updateDoc(postRef, { likes: postLikes });

        // ✅ Update Like Count UI
        e.target.closest(".like-btn").querySelector(".like-count").textContent = postLikes.length;
        e.target.closest(".like-btn").classList.toggle("liked", postLikes.includes(userUID));
    }
});

let currentPostId = null; // ✅ Track Post ID for Comments

document.addEventListener("click", async (e) => {
    if (e.target.closest(".comment-btn")) {
        currentPostId = e.target.closest(".comment-btn").getAttribute("data-post-id");
        openCommentModal();
    }
});

// ✅ Open Comment Modal
async function openCommentModal() {
    document.getElementById("commentModal").style.display = "block";
    document.getElementById("commentOverlay").style.display = "block";
    loadComments();
}

// ✅ Close Comment Modal
document.getElementById("closeCommentModal").addEventListener("click", () => {
    document.getElementById("commentModal").style.display = "none";
    document.getElementById("commentOverlay").style.display = "none";
});

// ✅ Load Comments and Replies (Initial Load)
async function loadComments() {
    const commentsContainer = document.getElementById("commentsContainer");
    commentsContainer.innerHTML = "<p>Loading comments...</p>";

    const commentsQuery = query(collection(db, "comments"), where("postId", "==", currentPostId));
    const commentSnapshots = await getDocs(commentsQuery);

    commentsContainer.innerHTML = "";

    const postDocRef = doc(db, "posts", currentPostId);
    const postSnap = await getDoc(postDocRef);
    const postOwnerId = postSnap.exists() ? postSnap.data().uid : null;

    let totalComments = 0;

    for (const docSnap of commentSnapshots.docs) {
        totalComments++; // ✅ Count the comment itself
        const commentData = docSnap.data();
        const commentId = docSnap.id;
        const commenterId = commentData.uid;

        let userSnap = await getDoc(doc(db, "users", commenterId));
        let username = userSnap.exists() ? userSnap.data().username : "Unknown";
        let profilePic = userSnap.exists() ? userSnap.data().profilePic : "";

        let avatarHTML = profilePic
            ? `<img src="${profilePic}" class="comment-avatar">`
            : `<div class="comment-avatar">${username.charAt(0).toUpperCase()}</div>`;

        let isAuthor = (postOwnerId === commenterId) ? "(Author)" : "";

        let deleteBtnHTML = (commentData.uid === localStorage.getItem("userUID") || postOwnerId === localStorage.getItem("userUID")) ?
            `<button class="delete-comment" data-comment-id="${commentId}">
                <i class="fas fa-trash"></i>
            </button>` : "";

        let commentElement = document.createElement("div");
        commentElement.classList.add("comment-item");
        commentElement.innerHTML = `
            <div class="comment-content">
                ${avatarHTML}
                <div class="comment-text">
                    <strong>${username} ${isAuthor}</strong>
                    <p>${commentData.comment}</p>
                    <small class="comment-time">${new Date(commentData.createdAt.seconds * 1000).toLocaleString()}</small>
                </div>
                <div class="comment-actions">
                    ${deleteBtnHTML}
                </div>
            </div>
            <button class="reply-comment" data-comment-id="${commentId}"><i class="fas fa-reply"></i> Reply</button>
            <div class="reply-section" id="replySection-${commentId}"></div>
        `;

        commentsContainer.appendChild(commentElement);

        let replyCount = await loadReplies(commentId);
        totalComments += replyCount; // ✅ Count all replies under this comment
    }

    updateCommentCount(currentPostId, totalComments);
}

// ✅ Show Reply Form (Allow Multiple Replies)
document.addEventListener("click", (e) => {
    if (e.target.closest(".reply-comment")) {
        const commentId = e.target.closest(".reply-comment").getAttribute("data-comment-id");
        const replySection = document.getElementById(`replySection-${commentId}`);

        let replyForm = document.createElement("div");
        replyForm.classList.add("reply-input-container");
        replyForm.innerHTML = `
            <input type="text" class="reply-input" placeholder="Write a reply..." />
            <button class="submit-reply" data-comment-id="${commentId}">Post</button>
        `;
        replySection.appendChild(replyForm);
    }
});

// ✅ Save Reply to Firebase (Update Count Correctly)
document.addEventListener("click", async (e) => {
    if (e.target.closest(".submit-reply")) {
        const submitButton = e.target.closest(".submit-reply");
        const commentId = submitButton.getAttribute("data-comment-id");
        const replyInput = submitButton.previousElementSibling;
        const replyText = replyInput.value.trim();

        if (!replyText || submitButton.disabled) return;

        submitButton.disabled = true;
        submitButton.innerText = "Posting...";

        try {
            await addDoc(collection(db, "comments", commentId, "replies"), {
                uid: localStorage.getItem("userUID"),
                reply: replyText,
                createdAt: new Date()
            });

            replyInput.value = "";
            await loadReplies(commentId);
            await updateTotalCommentCount();
        } catch (error) {
            console.error("Error posting reply:", error.message);
        }

        submitButton.disabled = false;
        submitButton.innerText = "Post";
    }
});

// ✅ Load Replies and Update Count
async function loadReplies(commentId) {
    const replySection = document.getElementById(`replySection-${commentId}`);
    replySection.innerHTML = "";

    const replyQuery = query(collection(db, "comments", commentId, "replies"));
    const replySnapshots = await getDocs(replyQuery);

    let replyCount = replySnapshots.docs.length;

    for (const docSnap of replySnapshots.docs) {
        let replyData = docSnap.data();
        let replyId = docSnap.id;
        let replyUserSnap = await getDoc(doc(db, "users", replyData.uid));
        let replyUsername = replyUserSnap.exists() ? replyUserSnap.data().username : "Unknown";
        let replyProfilePic = replyUserSnap.exists() ? replyUserSnap.data().profilePic : "";

        let replyAvatarHTML = replyProfilePic
            ? `<img src="${replyProfilePic}" class="reply-avatar">`
            : `<div class="reply-avatar">${replyUsername.charAt(0).toUpperCase()}</div>`;

        let deleteReplyBtnHTML = (replyData.uid === localStorage.getItem("userUID")) ?
            `<button class="delete-reply" data-comment-id="${commentId}" data-reply-id="${replyId}">
                <i class="fas fa-trash"></i>
            </button>` : "";

        let replyElement = document.createElement("div");
        replyElement.classList.add("reply-item");
        replyElement.innerHTML = `
            <div class="reply-content">
                ${replyAvatarHTML}
                <div class="reply-text">
                    <strong>${replyUsername}</strong>
                    <p>${replyData.reply}</p>
                    <small>${new Date(replyData.createdAt.seconds * 1000).toLocaleString()}</small>
                </div>
                <div class="reply-actions">${deleteReplyBtnHTML}</div>
            </div>
        `;
        replySection.appendChild(replyElement);
    }

    return replyCount;
}

// ✅ Delete Comment or Reply (Update Count Correctly & Prevent Multiple Deletes)
document.addEventListener("click", async (e) => {
    const deleteButton = e.target.closest(".delete-comment, .delete-reply");
    if (!deleteButton || deleteButton.disabled) return;

    deleteButton.disabled = true;

    if (deleteButton.classList.contains("delete-comment")) {
        const commentId = deleteButton.getAttribute("data-comment-id");

        try {
            await deleteDoc(doc(db, "comments", commentId));
            await updateTotalCommentCount();
            await loadComments();
        } catch (error) {
            console.error("Error deleting comment:", error.message);
        }
    }

    if (deleteButton.classList.contains("delete-reply")) {
        const commentId = deleteButton.getAttribute("data-comment-id");
        const replyId = deleteButton.getAttribute("data-reply-id");

        try {
            await deleteDoc(doc(db, "comments", commentId, "replies", replyId));
            await updateTotalCommentCount();
            await loadReplies(commentId);
        } catch (error) {
            console.error("Error deleting reply:", error.message);
        }
    }

    deleteButton.disabled = false;
});

async function updateTotalCommentCount() {
    const commentsQuery = query(collection(db, "comments"), where("postId", "==", currentPostId));
    const commentSnapshots = await getDocs(commentsQuery);
    let totalCount = commentSnapshots.docs.length;

    for (const docSnap of commentSnapshots.docs) {
        const repliesQuery = query(collection(db, "comments", docSnap.id, "replies"));
        const repliesSnapshot = await getDocs(repliesQuery);
        totalCount += repliesSnapshot.docs.length;
    }

    updateCommentCount(currentPostId, totalCount);
}


function updateCommentCount(postId, count) {
    const commentCountElement = document.querySelector(`.comment-btn[data-post-id="${postId}"] .comment-count`);
    if (commentCountElement) {
        commentCountElement.textContent = count;
    }
}

    

document.getElementById("submitComment").addEventListener("click", async () => {
    const submitButton = document.getElementById("submitComment");
    const commentInput = document.getElementById("newComment");

    const commentText = commentInput.value.trim();
    if (!commentText) return;

    // ✅ Disable button to prevent multiple clicks
    submitButton.disabled = true;
    submitButton.innerText = "Posting..."; // UI Feedback

    try {
        await addDoc(collection(db, "comments"), {
            postId: currentPostId,
            uid: localStorage.getItem("userUID"),
            comment: commentText,
            createdAt: new Date()
        });

        // ✅ Clear input field after successful post
        commentInput.value = "";

        // ✅ Fetch updated comment count and update UI
        const updatedCommentsQuery = query(collection(db, "comments"), where("postId", "==", currentPostId));
        const updatedCommentSnapshots = await getDocs(updatedCommentsQuery);
        updateCommentCount(currentPostId, updatedCommentSnapshots.size);

        // ✅ Reload comments in modal
        await loadComments();
    } catch (error) {
        console.error("Error adding comment:", error.message);
        alert("Error adding comment.");
    }

    // ✅ Re-enable button after the comment is posted
    submitButton.disabled = false;
    submitButton.innerText = "Post";
});



    // ✅ Sidebar Toggle Function
    function toggleSidebar() {
        document.querySelector(".sidebar").classList.toggle("open");
    }
    window.toggleSidebar = toggleSidebar;

    // ✅ Logout Functionality
    const logoutBtn = document.querySelector(".logout");
    const overlay = document.querySelector("#overlay");
    const logoutModal = document.querySelector("#logoutModal");
    const dashboard = document.querySelector(".dashboard");

    function showLogoutModal() {
        overlay.style.display = "block";
        logoutModal.style.display = "block";

        setTimeout(() => {
            overlay.style.display = "none";
            logoutModal.style.display = "none";
            window.location.href = "login-signup.html";
        }, 2000);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await signOut(auth);
                localStorage.removeItem("userUID");
                dashboard.style.display = "none";
                setTimeout(() => {
                    showLogoutModal();
                }, 500);
            } catch (error) {
                alert("Error logging out: " + error.message);
            }
        });
    };
