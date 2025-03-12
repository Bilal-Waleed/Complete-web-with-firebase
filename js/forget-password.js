import { auth, sendPasswordResetEmail } from "./firebase.js";

document.addEventListener("DOMContentLoaded", function () {
    const resetForm = document.getElementById("resetPasswordForm");
    const resetEmail = document.getElementById("resetEmail");
    const successModal = document.getElementById("successModal");
    const overlay = document.getElementById("overlay");

    // ✅ Function to show error message below input
    function showError(message) {
        let errorElement = document.getElementById("resetEmailError");
        if (!errorElement) {
            errorElement = document.createElement("p");
            errorElement.id = "resetEmailError";
            errorElement.classList.add("error-message");
            resetEmail.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    // ✅ Function to clear error message
    function clearError() {
        const errorElement = document.getElementById("resetEmailError");
        if (errorElement) {
            errorElement.textContent = "";
        }
    }

    // ✅ Live Validation for Email Input
    resetEmail.addEventListener("input", function () {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!resetEmail.value.trim()) {
            showError("Email is required.");
        } else if (!emailPattern.test(resetEmail.value.trim())) {
            showError("Invalid email format.");
        } else {
            clearError();
        }
    });

    // ✅ Show success modal after email reset request
    function showSuccessModal() {
        overlay.style.display = "block";
        successModal.style.display = "block";

        setTimeout(() => {
            overlay.style.display = "none";
            successModal.style.display = "none";
            window.location.href = "login-signup.html"; // ✅ Redirect after 3 seconds
        }, 3000);
    }

    // ✅ Form Submit Handler
    resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = resetEmail.value.trim();

        // ✅ Check if email is empty or invalid
        if (!email) {
            showError("Email is required.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError("Invalid email format.");
            return;
        }

        // ✅ If valid, send reset email
        try {
            await sendPasswordResetEmail(auth, email);
            showSuccessModal();
        } catch (error) {
            showError(error.message); // ✅ Show Firebase error message
        }
    });
});
