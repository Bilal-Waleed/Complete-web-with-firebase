// ✅ Firebase Imports
import { auth, db, signOut, onAuthStateChanged, doc, getDoc, collection, getDocs, updateDoc, query,
    where, addDoc, deleteDoc, orderBy } from "../js/firebase.js";

    document.addEventListener("DOMContentLoaded", async function () {
        // ✅ Select Elements
        const userProfileContainer = document.querySelector("#user-profile-container"); // ✅ User profile section
        const postsContainer = document.querySelector("#posts-container"); // ✅ Posts container
        const loadingMessage = document.querySelector("#loading-message"); // ✅ Loading message
    
        // ✅ Get User UID from Local Storage
        const storedUID = localStorage.getItem("userUID");
    
        // ✅ Redirect If Not Logged In
        onAuthStateChanged(auth, async (user) => {
            if (!user || !storedUID || user.uid !== storedUID) {
                console.log("Unauthorized access! Redirecting to login page.");
                setTimeout(() => {
                    window.location.href = "login-signup.html";
                }, 1000);
                return;
            }
    
            // ✅ Fetch User Data from Firestore
            const userDocRef = doc(db, "users", storedUID);
            const userDocSnap = await getDoc(userDocRef);
    
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                displayUserProfile(userData);
            } else {
                console.log("User data not found!");
            }
    
            // ✅ Fetch All Posts from Firestore
            await fetchAllPosts();
        });
    
        // ✅ Function to Display User Profile (Avatar + Name + Notification Icon)
        function displayUserProfile(userData) {
            const username = userData.username || "User";
            const profilePic = userData.profilePic || "";
    
            // ✅ Avatar & Name
            let avatarHTML = profilePic
                ? `<img src="${profilePic}" alt="Profile Picture" class="profile-avatar">`
                : `<div class="profile-avatar">${username.charAt(0).toUpperCase()}</div>`;
    
            // ✅ Preserve Notification Icon
            userProfileContainer.innerHTML = `
                <div class="profile-details">
                    <div class="profile-clickable">
                        ${avatarHTML}
                        <span class="profile-name">${username}</span>
                    </div>
                </div>
                <!-- ✅ Notification Icon (Right Side) -->
                <div class="notification-icon">
                    <i class="fas fa-bell"></i>
                    <span class="notification-badge" id="notificationBadge"></span>
                </div>
            `;
    
            // ✅ Click Event for Profile Redirect
            document.querySelector(".profile-clickable").addEventListener("click", () => {
                window.location.href = `profile.html?uid=${storedUID}`;
            });
    
            // ✅ Attach Click Event to Notification Icon After Rendering
            document.querySelector(".notification-icon").addEventListener("click", openNotifications);
        }
    
        // ✅ Function to Open Notifications Page
        function openNotifications() {
            window.location.href = "notifications.html";
        }
    
        // ✅ Expose Function to Global Scope (For onclick in HTML)
        window.openNotifications = openNotifications;




    async function fetchAllPosts() {
        const postsRef = collection(db, "posts");
        
        // ✅ Fetch posts sorted by "createdAt" in descending order (newest first)
        const postsQuery = query(postsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(postsQuery);
    
        postsContainer.innerHTML = "";
    
        if (querySnapshot.empty) {
            postsContainer.innerHTML = "<p>No posts found.</p>";
            return;
        }
    
        const usersCache = {}; 
        for (const docSnapshot of querySnapshot.docs) {
            const postData = docSnapshot.data();
            const postId = docSnapshot.id;
    
            const userId = postData.uid;
            let username = "Unknown"; 
            let profilePic = ""; 
    
            if (usersCache[userId]) {
                username = usersCache[userId].username;
                profilePic = usersCache[userId].profilePic;
            } else {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
    
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    username = userData.username || "Unknown";
                    profilePic = userData.profilePic || "";
                    usersCache[userId] = { username, profilePic };
                }
            }
    
            let avatarHTML = profilePic
                ? `<img src="${profilePic}" alt="Profile Picture" class="avatar">`
                : `<div class="avatar">${username.charAt(0).toUpperCase()}</div>`;
    
                let postDate = "Unknown time";
                let editedLabel = "";  
                
                if (postData.updatedAt) { 
                    // If updatedAt exists, show update time & "Edited" label
                    postDate = new Date(postData.updatedAt.seconds * 1000).toLocaleString();
                    editedLabel = " (Edited)";  
                } else if (postData.createdAt) { 
                    // Otherwise, show created time
                    postDate = new Date(postData.createdAt.seconds * 1000).toLocaleString();
                }
                
    
            // ✅ Fetch Comment Count
            const commentsQuery = query(collection(db, "comments"), where("postId", "==", postId));
            const commentSnapshots = await getDocs(commentsQuery);
            const commentCount = commentSnapshots.size;
    
            // ✅ Create Post Element
            const postElement = document.createElement("div");
            postElement.classList.add("post");
            postElement.innerHTML = `
                <div class="post-header">
                    ${avatarHTML}
                    <div class="post-user">
                        <strong>${username}</strong>
                        <span class="post-time">${postDate}${editedLabel}</span>

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
            postsContainer.appendChild(postElement);
        }
    
        if (loadingMessage) {
            loadingMessage.style.display = "none";
        }
    }
    
    


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
     

    // function updateCommentCount(count) {
    //     document.querySelector(`.comment-btn[data-post-id="${currentPostId}"] .comment-count`).textContent = count;
    // }    
    
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
    
            // ✅ Reload comments and update count
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

        console.log("✅ Logout Modal Opened");

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
                if (dashboard) {
                    dashboard.style.display = "none";
                }
                setTimeout(() => {
                    showLogoutModal();
                }, 500);
            } catch (error) {
                alert("Error logging out: " + error.message);
            }
        });
    }
});
