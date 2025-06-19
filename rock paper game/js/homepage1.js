// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4hzHmvMBDWnvljH0ByI3TeqlWYVIeMjc",
  authDomain: "rockpaper-736da.firebaseapp.com",
  projectId: "rockpaper-736da",
  storageBucket: "rockpaper-736da.firebasestorage.app",
  messagingSenderId: "1098114028695",
  appId: "1:1098114028695:web:8236a5a8388289da64c5d2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔥 Block the page until authentication is checked
document.addEventListener("DOMContentLoaded", () => {
  document.body.style.display = "none"; // Hide page until authentication check is complete

  onAuthStateChanged(auth, (user) => {
    if (user) {
      document.body.style.display = "block"; // Show page if authenticated
    } else {
      window.location.replace("login.html"); // Force redirect if not logged in
    }
  });
});

// ✅ Logout functionality
document.getElementById("logout-btn").addEventListener("click", function () {
  signOut(auth)
    .then(() => {
      window.location.replace("login.html"); // Redirect after logout
    })
    .catch((error) => {
      alert("Logout failed: " + error.message);
    });
});
