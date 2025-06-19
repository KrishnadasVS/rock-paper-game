import { db, auth, verifyAdminAccess } from "./auth.js";
import {
  collection,
  query,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  deleteDoc,
  orderBy,
  writeBatch,
  limit,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// DOM Elements
const sidebarNavItems = document.querySelectorAll(".sidebar-nav li");
const adminSections = document.querySelectorAll(".admin-section");
const usersTable = document.getElementById("users-table");
const leaderboardTable = document.getElementById("leaderboard-table");
const userSearchInput = document.getElementById("user-search");
const resetScoresBtn = document.getElementById("reset-scores-btn");
const logoutBtn = document.getElementById("logout-btn");


const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmActionBtn = document.getElementById("confirm-action");
const confirmCancelBtn = document.getElementById("confirm-cancel");


const editNameModal = document.getElementById("edit-name-modal");
const editNameValue = document.getElementById("edit-name-value");
const saveNameBtn = document.getElementById("save-name-btn");
const cancelEditName = document.getElementById("cancel-edit-name");

// State
let currentUserId = null;
let currentAction = null;
let currentActionData = null;

document.body.style.display = "none";
// Call this at the start of your admin.js
checkNavigationEntry();
// Add to admin.js
function checkNavigationEntry() {
  const navigationEntries = performance.getEntriesByType("navigation");
  if (navigationEntries.length > 0) {
    const navEntry = navigationEntries[0];
    if (navEntry.type === "navigate" || navEntry.type === "reload") {
      // Page was loaded directly or refreshed
      localStorage.setItem("adminRedirectCheck", "true");
    }
  }
}

// Remove the duplicate DOMContentLoaded listener and combine them into one:
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if coming from login flow
    if (
      !localStorage.getItem("fromLogin") &&
      localStorage.getItem("adminRedirectCheck")
    ) {
      throw new Error("Direct access not allowed");
    }
    localStorage.removeItem("fromLogin");

    // 1. Check if user is logged in and is admin
    await verifyAdminAccess();

    // 2. Verify the auth state matches localStorage
    const userId = localStorage.getItem("userId");
    if (!userId || auth.currentUser?.uid !== userId) {
      throw new Error("Authentication mismatch");
    }

    // 3. Additional verification - get fresh data from Firestore
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists() || !userDoc.data().isAdmin) {
      throw new Error("Admin privileges revoked");
    }

    // Only show page if all checks pass
    document.body.style.display = "block";
    initializeAdminDashboard();
  } catch (error) {
    console.error("Admin access denied:", error);
    // Clear any sensitive data
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");

    // Redirect to login with error
    localStorage.setItem("loginError", "Admin access required");
    window.location.href = "login.html";
  }
});

function initializeAdminDashboard() {
  loadUsers();
  loadLeaderboard();
  setupEventListeners(); // This now includes all event listeners
}

function setupEventListeners() {
  // Sidebar navigation
  sidebarNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      const sectionId = item.dataset.section + "-section";
      sidebarNavItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      adminSections.forEach((section) => section.classList.remove("active"));
      document.getElementById(sectionId).classList.add("active");
    });
  });

  // User search
  userSearchInput.addEventListener("input", debounce(loadUsers, 300));

  // Reset scores button
  resetScoresBtn.addEventListener("click", () => {
    showConfirmation(
      "Reset All Scores",
      "Are you sure you want to reset ALL users' scores to 0? This action cannot be undone.",
      "resetAllScores"
    );
  });

  // Logout
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        localStorage.clear();
        window.location.href = "login.html";
      })
      .catch((error) => {
        console.error("Logout error:", error);
        alert("Logout failed: " + error.message);
      });
  });

  // Edit name modal
  cancelEditName.addEventListener("click", () => {
    editNameModal.style.display = "none";
  });

  saveNameBtn.addEventListener("click", async () => {
    const newName = editNameValue.value.trim();
    if (!newName) {
      alert("Please enter a valid name");
      return;
    }

    try {
      await updateDoc(doc(db, "users", currentUserId), {
        name: newName,
      });
      alert("Name updated successfully!");
      editNameModal.style.display = "none";
      loadUsers();
      loadLeaderboard();
    } catch (error) {
      console.error("Error updating name:", error);
      alert("Failed to update name: " + error.message);
    }
  });

  // Confirmation modal
  confirmCancelBtn.addEventListener("click", () => {
    confirmModal.style.display = "none";
    resetActionState();
  });

  confirmActionBtn.addEventListener("click", async () => {
    try {
      switch (currentAction) {
        case "deleteUser":
          await deleteDoc(doc(db, "users", currentUserId));
          alert("User deleted successfully");
          break;
        case "resetAllScores":
          await resetAllScores();
          alert("All scores have been reset to 0");
          break;
        default:
          break;
      }

      // Refresh data
      loadUsers();
      loadLeaderboard();
    } catch (error) {
      console.error("Error performing action:", error);
      alert("Error performing action: " + error.message);
    } finally {
      confirmModal.style.display = "none";
      resetActionState();
    }
  });
}

async function loadUsers() {
  try {
    usersTable.innerHTML = `
      <tr>
          <td colspan="5" class="loading-state">
            <div class="spinner"></div> Loading users...
          </td>
        </tr>`;

    const searchTerm = userSearchInput.value.toLowerCase();
    const usersQuery = query(collection(db, "users"), limit(500));
    const querySnapshot = await getDocs(usersQuery);

    if (querySnapshot.empty) {
      usersTable.innerHTML = "<tr><td colspan='5'>No users found</td></tr>";
      return;
    }

    usersTable.innerHTML = "";

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;

      // Filter by search term if provided
      if (
        searchTerm &&
        !userData.name.toLowerCase().includes(searchTerm) &&
        !userData.email.toLowerCase().includes(searchTerm)
      ) {
        return;
      }

      const row = document.createElement("tr");

      // Name
      const nameCell = document.createElement("td");
      nameCell.textContent = userData.name || "Anonymous";
      row.appendChild(nameCell);

      // Email
      const emailCell = document.createElement("td");
      emailCell.textContent = userData.email || "No email";
      row.appendChild(emailCell);

      // Score
      const scoreCell = document.createElement("td");
      scoreCell.textContent = userData.score || 0;
      row.appendChild(scoreCell);

      // Status
      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className =
        "badge " + (userData.isAdmin ? "badge-primary" : "badge-danger");
      statusBadge.textContent = userData.isAdmin ? "Admin" : "User";
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      // Actions
      const actionsCell = document.createElement("td");
      actionsCell.style.display = "flex";
      actionsCell.style.gap = "5px";

      // Edit Score Button
      const editBtn = document.createElement("button");
       editBtn.className = "btn btn-primary";
       editBtn.innerHTML = '<i class="bx bx-edit"></i> Edit Name';
       editBtn.addEventListener("click", () =>
       openEditNameModal(userId, userData)
      );
      actionsCell.appendChild(editBtn);

      // Delete Button (only for non-admin users)
      if (!userData.isAdmin) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger";
        deleteBtn.innerHTML = '<i class="bx bx-trash"></i> Delete';
        deleteBtn.addEventListener("click", () =>
          showConfirmation(
            "Delete User",
            `Are you sure you want to delete user "${userData.name}"? This action cannot be undone.`,
            "deleteUser",
            userId
          )
        );
        actionsCell.appendChild(deleteBtn);
      }

      row.appendChild(actionsCell);
      usersTable.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading users:", error);
    usersTable.innerHTML = `
    <tr>
        <td colspan="5" class="error-state">
          Error loading users: ${error.message}
        </td>
      </tr>`;
  }
}

async function loadLeaderboard() {
  try {
    leaderboardTable.innerHTML =
      "<tr><td colspan='4'>Loading leaderboard...</td></tr>";

    const leaderboardQuery = query(
      collection(db, "users"),
      orderBy("score", "desc")
    );

    const querySnapshot = await getDocs(leaderboardQuery);

    if (querySnapshot.empty) {
      leaderboardTable.innerHTML =
        "<tr><td colspan='4'>No users found</td></tr>";
      return;
    }

    leaderboardTable.innerHTML = "";
    let rank = 1;

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;

      const row = document.createElement("tr");

      // Rank
      const rankCell = document.createElement("td");
      rankCell.textContent = rank++;
      row.appendChild(rankCell);

      // Name
      const nameCell = document.createElement("td");
      nameCell.textContent = userData.name || "Anonymous";
      row.appendChild(nameCell);

      // Score
      const scoreCell = document.createElement("td");
      scoreCell.textContent = userData.score || 0;
      row.appendChild(scoreCell);

      // Actions
      const actionsCell = document.createElement("td");
      actionsCell.style.display = "flex";
      actionsCell.style.gap = "5px";

      // Edit Score Button
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-primary";
      editBtn.innerHTML = '<i class="bx bx-edit"></i> Edit';
      editBtn.addEventListener("click", () =>
      openEditNameModal(userId, userData)
      );
      actionsCell.appendChild(editBtn);

      row.appendChild(actionsCell);
      leaderboardTable.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    leaderboardTable.innerHTML =
      "<tr><td colspan='4'>Error loading leaderboard</td></tr>";
  }
}

function openEditNameModal(userId, userData) {
  if (!editNameModal || !editNameValue) return;
  currentUserId = userId;
  editNameValue.value = userData.name || "";
  editNameModal.style.display = "flex";
}

async function resetAllScores() {
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

function showConfirmation(title, message, action, userId = null) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  currentAction = action;
  currentUserId = userId;
  confirmModal.style.display = "flex";
}

function resetActionState() {
  currentAction = null;
  currentUserId = null;
  currentActionData = null;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
