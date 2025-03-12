// ✅ Firebase Imports
import { auth, db, doc, getDoc, updateDoc } from "../js/firebase.js";

document.addEventListener("DOMContentLoaded", async function () {
    const usernameInput = document.querySelector("#username");
    const bioInput = document.querySelector("#bio");
    const profilePicInput = document.querySelector("#profile-pic");
    const profilePreview = document.querySelector("#profile-preview");
    const saveProfileBtn = document.querySelector("#save-profile");

    const usernameError = document.querySelector("#username-error");
    const bioError = document.querySelector("#bio-error");

    const successOverlay = document.getElementById("successOverlay");
    const successModal = document.getElementById("successModal");
    const backButton = document.querySelector(".back-btn"); // ✅ Back button

    let storedUID = localStorage.getItem("userUID");

    // ✅ Redirect if not logged in
    if (!storedUID) {
        window.location.href = "login-signup.html";
        return;
    }

    // ✅ Load User Data from Firestore
    const userDocRef = doc(db, "users", storedUID);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        usernameInput.value = userData.username || "";
        bioInput.value = userData.bio || "";
        profilePreview.src = userData.profilePic || "https://via.placeholder.com/100"; // Default image
    } else {
        alert("User data not found!");
        window.location.href = "dashboard.html";
    }

    // ✅ Back Button (Redirect to Profile Page)
    if (backButton) {
        backButton.addEventListener("click", () => {
            window.location.href = "profile.html";
        });
    }

    // ✅ Validate Input Fields
    function validateInputs() {
        let valid = true;
        usernameError.textContent = "";
        bioError.textContent = "";

        // ✅ Username Validation (Max 20 Characters)
        if (usernameInput.value.length > 20) {
            usernameError.textContent = "Username must be 20 characters or less.";
            valid = false;
        }

        // ✅ Bio Validation 
        let wordCount = bioInput.value.trim().split(/\s+/).length;
        if (wordCount > 40) {
            bioError.textContent = "Bio must be 40 words or less.";
            valid = false;
        }

        return valid;
    }

    // ✅ Show Error Messages While Typing
    usernameInput.addEventListener("input", validateInputs);
    bioInput.addEventListener("input", validateInputs);

    // ✅ Profile Picture Preview
    profilePicInput.addEventListener("change", function () {
        const file = profilePicInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                profilePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // ✅ Upload Image to Cloudinary
    async function uploadImageToCloudinary(file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "profile-pic"); // 🔹 Your Cloudinary Upload Preset

        try {
            const response = await fetch("https://api.cloudinary.com/v1_1/dqlkqbawk/image/upload", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error("Failed to upload image.");
            }

            const data = await response.json();
            return data.secure_url; // ✅ Cloudinary returns a secure image URL
        } catch (error) {
            console.error("❌ Cloudinary Upload Error:", error);
            alert("Failed to upload image. Please try again.");
            throw error;
        }
    }

    // ✅ Save Profile (Uploads Image & Updates Firestore)
    saveProfileBtn.addEventListener("click", async function (e) {
        e.preventDefault();

        if (!validateInputs()) return;

        try {
            let profilePicURL = profilePreview.src; // Default to existing image

            // ✅ Upload New Profile Picture to Cloudinary
            if (profilePicInput.files.length > 0) {
                const file = profilePicInput.files[0];
                profilePicURL = await uploadImageToCloudinary(file);
            }

            // ✅ Update Firestore User Data
            await updateDoc(userDocRef, {
                username: usernameInput.value.trim(),
                bio: bioInput.value.trim(),
                profilePic: profilePicURL,
            });

            // ✅ Show Success Modal
            successOverlay.style.display = "block";
            successModal.style.display = "block";

            setTimeout(() => {
                successOverlay.style.display = "none";
                successModal.style.display = "none";
                window.location.href = "profile.html";
            }, 2000);

        } catch (error) {
            console.error("❌ Error updating profile:", error);
            alert("Error updating profile. Please try again.");
        }
    });
});
