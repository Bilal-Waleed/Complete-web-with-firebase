// ✅ Firebase Imports
import { 
    db, doc, getDoc, collection, getDocs, query, where, updateDoc, deleteDoc, addDoc, onSnapshot 
} from "../js/firebase.js";

document.addEventListener("DOMContentLoaded", async function () {
    const storedUID = localStorage.getItem("userUID");
    const requestsContainer = document.querySelector("#requests-container");

    // Redirect to login if no UID is found
    if (!storedUID) {
        window.location.href = "login-signup.html";
        return;
    }

    // ✅ Helper Function to Get Avatar
    function getAvatar(userData) {
        if (userData.profilePic) {
            return `<img src="${userData.profilePic}" class="profile-circle">`;
        } else {
            return `<div class="avatar-placeholder">${userData.username.charAt(0).toUpperCase()}</div>`;
        }
    }

    // ✅ Friend Requests in Real-Time
    function fetchFriendRequestsRealTime() {
        const requestRef = collection(db, "friend_requests");
        const q = query(requestRef, where("receiver", "==", storedUID), where("status", "==", "pending"));

        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                    const request = change.doc.data();
                    const senderSnap = await getDoc(doc(db, "users", request.sender));
                    const senderData = senderSnap.data();

                    const requestCard = document.createElement("div");
                    requestCard.classList.add("notification-card");
                    requestCard.setAttribute("data-notification-id", change.doc.id);
                    requestCard.innerHTML = `
                        ${getAvatar(senderData)}
                        <div class="notification-info">
                            <p><strong>${senderData.username}</strong> sent you a friend request.</p>
                            <p class="timestamp">${new Date(request.timestamp.toDate()).toLocaleString()}</p>
                        </div>
                        <div class="buttons-container">
                            <button class="accept-btn" data-request-id="${change.doc.id}" data-sender-id="${request.sender}">Accept</button>
                            <button class="cancel-btn" data-request-id="${change.doc.id}">Decline</button>
                        </div>
                    `;
                    requestsContainer.prepend(requestCard); // ✅ Latest request added at the top
                }

                if (change.type === "removed") {
                    document.querySelector(`[data-notification-id="${change.doc.id}"]`)?.remove();
                }
            });
        });
    }

    // ✅ Likes & Comments Notifications (Real-Time)
    async function fetchPostNotifications() {
        const postsQuery = query(collection(db, "posts"), where("uid", "==", storedUID));
        const postsSnapshot = await getDocs(postsQuery);
        let userPostIds = [];

        postsSnapshot.forEach((postDoc) => {
            userPostIds.push(postDoc.id);
        });

        if (userPostIds.length > 0) {
            // ✅ Likes Notifications (Real-Time)
            userPostIds.forEach((postId) => {
                const postRef = doc(db, "posts", postId);
                onSnapshot(postRef, async (postDoc) => {
                    if (!postDoc.exists()) return;

                    const postData = postDoc.data();
                    const likesArray = postData.likes || [];

                    // ✅ Remove previous like notifications
                    document.querySelectorAll(`[data-post-id="${postId}"][data-type="like"]`).forEach(el => el.remove());

                    likesArray.forEach(async (userId) => {
                        // Skip if the user liked their own post
                        if (userId === storedUID) return;

                        const likerSnap = await getDoc(doc(db, "users", userId));
                        if (!likerSnap.exists()) return;

                        const likerData = likerSnap.data();
                        const likeCard = document.createElement("div");
                        likeCard.classList.add("notification-card");
                        likeCard.setAttribute("data-notification-id", postId + "-like");
                        likeCard.setAttribute("data-post-id", postId);
                        likeCard.setAttribute("data-type", "like");
                        likeCard.innerHTML = `
                            ${getAvatar(likerData)}
                            <div class="notification-info">
                                <p><strong>${likerData.username}</strong> liked your post.</p>
                                <p class="timestamp">${new Date().toLocaleString()}</p>
                            </div>
                        `;
                        requestsContainer.prepend(likeCard);
                    });
                });
            });

            // ✅ Comments Notifications (Real-Time)
            const commentsQuery = query(collection(db, "comments"), where("postId", "in", userPostIds));
            onSnapshot(commentsQuery, (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === "added") {
                        const commentData = change.doc.data();
                        const commenterId = commentData.uid;

                        // Skip if the user commented on their own post
                        if (commenterId === storedUID) return;

                        const commenterSnap = await getDoc(doc(db, "users", commenterId));
                        if (!commenterSnap.exists()) return;

                        const commenterData = commenterSnap.data();
                        const commentCard = document.createElement("div");
                        commentCard.classList.add("notification-card");
                        commentCard.setAttribute("data-notification-id", change.doc.id);
                        commentCard.innerHTML = `
                            ${getAvatar(commenterData)}
                            <div class="notification-info">
                                <p><strong>${commenterData.username}</strong> commented on your post: "${commentData.comment}"</p>
                                <p class="timestamp">${new Date(commentData.createdAt.toDate()).toLocaleString()}</p>
                            </div>
                        `;
                        requestsContainer.prepend(commentCard);
                    }
                    if (change.type === "removed") {
                        document.querySelector(`[data-notification-id="${change.doc.id}"]`)?.remove();
                    }
                });
            });
        }
    }


    fetchFriendRequestsRealTime();
    fetchPostNotifications(); 

    document.addEventListener("click", async function (event) {
        const requestId = event.target.getAttribute("data-request-id");

        if (event.target.classList.contains("accept-btn")) {
            const senderId = event.target.getAttribute("data-sender-id");

            await updateDoc(doc(db, "friend_requests", requestId), { status: "accepted" });

            await addDoc(collection(db, "friends"), {
                user1: storedUID,
                user2: senderId,
                timestamp: new Date()
            });

            event.target.textContent = "Friend";
            event.target.disabled = true;
            event.target.nextElementSibling.style.display = "none";
        }

        if (event.target.classList.contains("cancel-btn")) {

            await deleteDoc(doc(db, "friend_requests", requestId));
            event.target.parentElement.remove();
        }
    });

    function toggleSidebar() {
        document.querySelector(".sidebar").classList.toggle("open");
    }
    window.toggleSidebar = toggleSidebar;
});