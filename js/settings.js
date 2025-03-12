// ✅ Firebase Imports
import { 
    auth, db, doc, deleteDoc, getDocs, query, collection, where, signOut,
    EmailAuthProvider, reauthenticateWithCredential, deleteUser, updateDoc
} from "../js/firebase.js";

document.addEventListener("DOMContentLoaded", async function () {
    const storedUID = localStorage.getItem("userUID");

    if (!storedUID) {
        window.location.href = "login-signup.html";
        return;
    }

    // ✅ Sidebar Toggle for Mobile
    function toggleSidebar() {
        document.querySelector(".sidebar").classList.toggle("open");
    }
    window.toggleSidebar = toggleSidebar;

    // ✅ Logout Functionality
    document.querySelector(".logout").addEventListener("click", async () => {
        await signOut(auth);
        localStorage.removeItem("userUID");

        document.getElementById("overlay").style.display = "block";
        document.getElementById("logoutModal").style.display = "block";

        setTimeout(() => {
            window.location.href = "login-signup.html";
        }, 2000);
    });

    // ✅ Delete Account Confirmation Modal (Ask for Password)
    document.getElementById("delete-account").addEventListener("click", () => {
        document.getElementById("confirmDeleteOverlay").style.display = "block";
        document.getElementById("confirmDeleteModal").style.display = "block";
    });

    // ✅ Cancel Delete Account
    document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
        document.getElementById("confirmDeleteOverlay").style.display = "none";
        document.getElementById("confirmDeleteModal").style.display = "none";
    });

    // ✅ Confirm Delete Account After Password Verification
    document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
        const user = auth.currentUser;
        const passwordInput = document.getElementById("deletePassword").value;
        const errorMsg = document.getElementById("passwordError");

        if (!passwordInput) {
            errorMsg.textContent = "Please enter your password.";
            return;
        }

        // ✅ Reauthenticate User
        const credential = EmailAuthProvider.credential(user.email, passwordInput);

        try {
            await reauthenticateWithCredential(user, credential);

            // ✅ If password is correct, delete user data
            await deleteUserData(storedUID, user);

            // ✅ Show success modal
            document.getElementById("successOverlay").style.display = "block";
            document.getElementById("successModal").style.display = "block";

            setTimeout(() => {
                window.location.href = "login-signup.html";
            }, 2000);
        } catch (error) {
            errorMsg.textContent = "Your password is incorrect.";
        }
    });

    // ✅ Function to delete user data
    async function deleteUserData(uid, user) {
        try {
            // ✅ Delete User's Profile
            await deleteDoc(doc(db, "users", uid));

            // ✅ Delete User's Posts
            const postQuery = query(collection(db, "posts"), where("uid", "==", uid));
            const postSnapshot = await getDocs(postQuery);
            const postDeletePromises = postSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
            await Promise.all(postDeletePromises);

            // ✅ Delete User's Comments
            const commentQuery = query(collection(db, "comments"), where("uid", "==", uid));
            const commentSnapshot = await getDocs(commentQuery);
            const commentDeletePromises = commentSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
            await Promise.all(commentDeletePromises);

            // ✅ Remove User from Likes Array in Posts
            const allPostsQuery = query(collection(db, "posts"));
            const allPostsSnapshot = await getDocs(allPostsQuery);

            const likeUpdatePromises = allPostsSnapshot.docs.map(async (postSnap) => {
                let postData = postSnap.data();
                let postLikes = postData.likes || [];

                if (postLikes.includes(uid)) {
                    postLikes = postLikes.filter(userId => userId !== uid);
                    await updateDoc(postSnap.ref, { likes: postLikes });
                }
            });
            await Promise.all(likeUpdatePromises);

            // ✅ Delete User from Firebase Authentication
            await deleteUser(user);

            // ✅ Sign Out User
            await signOut(auth);
            localStorage.removeItem("userUID");

        } catch (error) {
            alert("Error deleting account. Please try again.");
        }
    }
});
