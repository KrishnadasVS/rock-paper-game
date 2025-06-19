// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  writeBatch,
  query,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-functions.js";
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
const db = getFirestore(app);

// Auth State Observer with email verification check
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user.uid);
    localStorage.setItem("userId", user.uid);

    // Check email verification status
    if (!user.emailVerified) {
      document
        .getElementById("resend-verification")
        ?.classList.remove("hidden");
    } else {
      document.getElementById("resend-verification")?.classList.add("hidden");
    }
  } else {
    console.log("No user is logged in");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
  }
});

// Resend verification email function
async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is logged in.");
  }

  try {
    await sendEmailVerification(user);
    return true;
  } catch (error) {
    console.error("Error resending verification email:", error);
    throw error;
  }
}
// Enhanced Signup Function with email verification
async function handleSignup(name, email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Send email verification
    await sendEmailVerification(user);

    // Store user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      score: 0,
      isAdmin: false, // Default to non-admin
      createdAt: new Date(),
      emailVerified: false,
    });

    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userId", user.uid);

    return true;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
}

// In auth.js, modify the handleLogin function
async function handleLogin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Check if email is verified
    if (!user.emailVerified) {
      showAlert("Please verify your email address to access all features.");
      document
        .getElementById("resend-verification")
        ?.classList.remove("hidden");
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      localStorage.setItem("userName", userData.name || "User");
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userId", user.uid);

      // Redirect admins directly to admin page
      if (userData.isAdmin) {
        window.location.href = "admin.html";
        return true;
      }
    }

    // Regular users go to homepage
    window.location.href = "homepage.html";
    return true;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Check email verification status
async function checkEmailVerified() {
  const user = auth.currentUser;
  if (!user) return false;

  // Force refresh the user data
  await user.reload();
  return user.emailVerified;
}
// Form Handlers
function setupLoginForm() {
  document
    .querySelector("#login-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = document.getElementById("login-email")?.value.trim();
      const password = document.getElementById("login-password")?.value;

      if (!email || !password) {
        showAlert("Please enter both email and password");
        return;
      }

      try {
        await handleLogin(email, password);
        // Set flag for admin redirect
        localStorage.setItem("fromLogin", "true");
      } catch (error) {
        showAlert(getUserFriendlyError(error));
      }
    });
}

function setupSignupForm() {
  document
    .querySelector("#signup-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = document.getElementById("name-id")?.value.trim();
      const email = document.getElementById("signup-email")?.value.trim();
      const password = document.getElementById("signup-password")?.value;

      if (!name || !email || !password) {
        showAlert("Please fill in all fields");
        return;
      }

      try {
        await handleSignup(name, email, password);
        window.location.href = "login.html"; // New page for verification reminder
      } catch (error) {
        showAlert(getUserFriendlyError(error));
      }
    });
}

// Password Reset Functionality
function setupPasswordReset() {
  document
    .querySelector("#forgot-password")
    ?.addEventListener("click", async (event) => {
      event.preventDefault();
      const email = document.getElementById("login-email")?.value.trim();

      if (!email) {
        showAlert("Please enter your email address");
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);
        showAlert("Password reset email sent! Check your inbox.");
      } catch (error) {
        showAlert(getUserFriendlyError(error));
      }
    });
}

// Verification UI Setup
function setupVerificationUI() {
  document
    .getElementById("resend-verification")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      await resendVerificationEmail();
    });
}

// Dark Mode Toggle
function initializeDarkMode() {
  let darkmode = localStorage.getItem("darkmode");
  const themeSwitch = document.getElementById("theme-switch");

  const enableDarkmode = () => {
    document.body.classList.add("darkmode");
    localStorage.setItem("darkmode", "active");
  };

  const disableDarkmode = () => {
    document.body.classList.remove("darkmode");
    localStorage.setItem("darkmode", null);
  };

  if (darkmode === "active") enableDarkmode();

  themeSwitch?.addEventListener("click", () => {
    darkmode = localStorage.getItem("darkmode");
    darkmode !== "active" ? enableDarkmode() : disableDarkmode();
  });
}

// Helper Functions
function showAlert(message) {
  // Replace with your preferred alert/notification system
  alert(message);
}

function getUserFriendlyError(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Invalid email address format.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/email-already-in-use":
      return "Email already in use. Please login instead.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/requires-recent-login":
      return "Please login again to perform this action.";
    default:
      return error.message;
  }
}

async function updateUserScore(userId, newScore) {
  try {
    // First check if email is verified
    const isVerified = await checkEmailVerified();
    if (!isVerified) {
      throw new Error("Please verify your email first.");
    }

    // Then get the current score from Firestore
    const userDoc = await getDoc(doc(db, "users", userId));
    const currentScore = userDoc.exists() ? userDoc.data().score || 0 : 0;
    if (newScore > currentScore) {
      await setDoc(
        doc(db, "users", userId),
        {
          score: newScore,
          lastUpdated: new Date(),
        },
        { merge: true }
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error updating score:", error);
    throw error;
  }
}

async function getUserData(userId) {
  try {
    const docSnap = await getDoc(doc(db, "users", userId));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeDarkMode();
  setupLoginForm();
  setupSignupForm();
  setupPasswordReset();
  setupVerificationUI();

  console.log("Firebase initialized:", { app, auth, db });
});

export {
  app,
  auth,
  db,
  updateUserScore,
  getUserData,
  resendVerificationEmail,
  checkEmailVerified,
};
// Add to your existing exports
export async function checkAdminStatus(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.exists() && userDoc.data().isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export async function getAllUsers() {
  try {
    const usersQuery = query(collection(db, "users"));
    const querySnapshot = await getDocs(usersQuery);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
}

export async function resetAllUserScores() {
  try {
    const usersQuery = query(collection(db, "users"));
    const querySnapshot = await getDocs(usersQuery);

    const batch = writeBatch(db);

    querySnapshot.forEach((doc) => {
      const userRef = doc.ref;
      batch.update(userRef, { score: 0 });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error resetting scores:", error);
    throw error;
  }
}
// Add to your existing auth.js exports
export async function verifyAdminAccess() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    throw new Error("User not logged in");
  }

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists() || !userDoc.data().isAdmin) {
      throw new Error("User is not an admin");
    }
    return true;
  } catch (error) {
    console.error("Admin verification failed:", error);
    throw error;
  }
}
