// ✅ Firebase Imports
import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    doc, 
    setDoc, 
    getDoc, 
    serverTimestamp,
    updateProfile 
} from "./firebase.js";

document.addEventListener("DOMContentLoaded", function () {

    // ✅ Sliding Panel Animation (Sign-in & Sign-up Toggle)
    const sign_in_btn = document.querySelector("#sign-in-btn");
    const sign_up_btn = document.querySelector("#sign-up-btn");
    const container = document.querySelector(".container");

    if (sign_up_btn && sign_in_btn && container) {
        sign_up_btn.addEventListener("click", () => container.classList.add("sign-up-mode"));
        sign_in_btn.addEventListener("click", () => container.classList.remove("sign-up-mode"));
    } else {
        console.error("Error: Sign-in or Sign-up button not found.");
    }

    // ✅ Form Elements
    const signupForm = document.querySelector("#signupForm");
    const loginForm = document.querySelector("#loginForm");
    const overlay = document.querySelector("#overlay");
    const successModal = document.querySelector("#successModal");

    // ✅ Function to Show Error Messages
    function showError(inputId, message) {
        let errorElement = document.getElementById(inputId + "Error");

        if (!errorElement) {
            errorElement = document.createElement("p");
            errorElement.id = inputId + "Error";
            errorElement.classList.add("error-message");

            const inputField = document.querySelector(`#${inputId}`).parentNode;
            inputField.parentNode.insertBefore(errorElement, inputField.nextSibling);
        }

        errorElement.textContent = message;
    }

    // ✅ Function to Clear Errors
    function clearError(inputId) {
        const errorElement = document.getElementById(inputId + "Error");
        if (errorElement) {
            errorElement.textContent = "";
        }
    }

    // ✅ Live Validation for Signup Form
    document.querySelector("#signup-username").addEventListener("input", function () {
        this.value.trim().length < 4 
            ? showError("signup-username", "Username must be at least 4 characters.")
            : clearError("signup-username");
    });

    document.querySelector("#signup-email").addEventListener("input", function () {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        !emailPattern.test(this.value.trim()) 
            ? showError("signup-email", "Invalid email format.") 
            : clearError("signup-email");
    });

    document.querySelector("#signup-password").addEventListener("input", function () {
        this.value.trim().length < 8 
            ? showError("signup-password", "Password must be at least 8 characters.") 
            : clearError("signup-password");
    });

    // ✅ Show Success Modal Function
    function showSuccessModal() {
        overlay.style.display = "block";
        successModal.style.display = "block";
        setTimeout(() => {
            overlay.style.display = "none";
            successModal.style.display = "none";
            window.location.href = "dash-post.html"; // ✅ Redirect after success
        }, 2000);
    }

    // ✅ Signup Form Submission (With Profile Picture Support)
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.querySelector("#signup-username").value.trim();
            const email = document.querySelector("#signup-email").value.trim();
            const password = document.querySelector("#signup-password").value.trim();

            let valid = true;

            if (username.length < 4) {
                showError("signup-username", "Username must be at least 4 characters.");
                valid = false;
            } else {
                clearError("signup-username");
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError("signup-email", "Invalid email format.");
                valid = false;
            } else {
                clearError("signup-email");
            }

            if (password.length < 8) {
                showError("signup-password", "Password must be at least 8 characters.");
                valid = false;
            } else {
                clearError("signup-password");
            }

            if (!valid) return; // ✅ Stop form submission if errors exist

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid, // ✅ UID field add kiya
                    username,
                    email,
                    profilePic: "", // ✅ Default empty profile picture
                    createdAt: serverTimestamp(),
                });
                

                localStorage.setItem("userUID", user.uid);
                showSuccessModal();
            } catch (error) {
                showError("signup-email", error.message);
            }
        });
    }

    // ✅ Login Form Submission
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.querySelector("#login-email").value.trim();
            const password = document.querySelector("#login-password").value.trim();

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const userDoc = await getDoc(doc(db, "users", user.uid));

                if (userDoc.exists()) {
                    localStorage.setItem("userUID", user.uid);
                    showSuccessModal();
                } else {
                    alert("User not found in database. Please sign up first.");
                    await auth.signOut(); // ❌ Log out user if not in Firestore
                }
            } catch (error) {
                showError("login-email", error.message);
            }
        });
    }

    // ✅ Google Signup & Login (Separate)
    const googleSignupBtn = document.querySelector("#googleSignup");
    const googleLoginBtn = document.querySelector("#googleLogin");

    async function googleSignup() {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                alert("User already exists. Please log in.");
                return;
            }

            await setDoc(userRef, { 
                uid: user.uid, // ✅ UID field add kiya
                username: user.displayName || "Google User",
                email: user.email,
                profilePic: user.photoURL || "", 
                createdAt: serverTimestamp(),
            });
            

            localStorage.setItem("userUID", user.uid);
            showSuccessModal();
        } catch (error) {
            alert(error.message);
        }
    }

    async function googleLogin() {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                alert("User not found in database. Please sign up first.");
                await auth.signOut();
                return;
            }

            localStorage.setItem("userUID", user.uid);
            showSuccessModal();
        } catch (error) {
            alert(error.message);
        }
    }

    if (googleSignupBtn) googleSignupBtn.addEventListener("click", googleSignup);
    if (googleLoginBtn) googleLoginBtn.addEventListener("click", googleLogin);
});
