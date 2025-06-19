import { app, auth, db } from '../js/auth.js';
import { 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  where,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  onSnapshot,
  limit
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js/auto/auto.min.js';

// DOM Elements
const domElements = {
  adminSections: document.querySelectorAll('.admin-section'),
  adminMenuItems: document.querySelectorAll('.admin-menu li'),
  darkModeBtn: document.getElementById('admin-dark-mode'),
  logoutBtn: document.getElementById('admin-logout'),
  refreshBtn: document.getElementById('refresh-data'),
  userSearch: document.getElementById('user-search'),
  userFilter: document.getElementById('user-filter'),
  usersTableBody: document.getElementById('users-table-body'),
  prevPageBtn: document.getElementById('prev-page'),
  nextPageBtn: document.getElementById('next-page'),
  pageInfo: document.getElementById('page-info'),
  feedbackStatus: document.getElementById('feedback-status'),
  feedbackList: document.getElementById('feedback-list'),
  exportScoresBtn: document.getElementById('export-scores'),
  resetScoresBtn: document.getElementById('reset-scores'),
  userModal: document.getElementById('user-modal'),
  confirmModal: document.getElementById('confirm-modal'),
  closeModalBtns: document.querySelectorAll('.close-modal'),
  cancelModalBtns: document.querySelectorAll('.cancel-btn'),
  confirmActionBtn: document.getElementById('confirm-action'),
  verifyUserBtn: document.getElementById('verify-user'),
  banUserBtn: document.getElementById('ban-user'),
  resetPasswordBtn: document.getElementById('reset-password'),
  deleteUserBtn: document.getElementById('delete-user')
};

// State management
const state = {
  currentPage: 1,
  usersPerPage: 10,
  totalUsers: 0,
  currentUserId: null,
  confirmAction: null,
  unsubscribeUsers: null,
  unsubscribeFeedback: null,
  charts: {
    registrations: null,
    difficulty: null
  }
};

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Set admin email from localStorage
    const adminEmail = localStorage.getItem('userEmail');
    if (adminEmail) {
      document.getElementById('admin-email').textContent = adminEmail;
    }
    
    // Load initial data
    await Promise.all([
      loadDashboardData(),
      loadUsersTable(),
      loadFeedback(),
      loadLeaderboard()
    ]);
    
    // Initialize charts
    initCharts();
    
    // Set up real-time listeners
    initRealTimeUpdates();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showAlert('Failed to initialize dashboard');
  }
});

// Dashboard functions
async function loadDashboardData() {
  try {
    showLoading('#total-users');
    showLoading('#total-games');
    showLoading('#verified-users');
    showLoading('#avg-score');
    
    const [usersSnapshot, verifiedSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'users'))),
      getDocs(query(collection(db, 'users'), where('emailVerified', '==', true)))
    ]);
    
    state.totalUsers = usersSnapshot.size;
    document.getElementById('total-users').textContent = state.totalUsers.toLocaleString();
    document.getElementById('verified-users').textContent = verifiedSnapshot.size.toLocaleString();
    
    let totalScore = 0;
    let totalGames = 0;
    usersSnapshot.forEach(doc => {
      totalScore += doc.data().score || 0;
      totalGames += doc.data().gamesPlayed || 0;
    });
    
    document.getElementById('total-games').textContent = totalGames.toLocaleString();
    document.getElementById('avg-score').textContent = (totalScore / Math.max(1, state.totalUsers)).toFixed(1);
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showError('#dashboard-section .stats-grid', 'Failed to load dashboard data');
  }
}

// User management functions
async function loadUsersTable() {
  try {
    showLoading('#users-table-body');
    
    let usersQuery;
    const baseQuery = collection(db, 'users');
    
    if (domElements.userSearch.value) {
      usersQuery = query(
        baseQuery,
        where('name', '>=', domElements.userSearch.value),
        where('name', '<=', domElements.userSearch.value + '\uf8ff'),
        orderBy('name'),
        limit(state.usersPerPage)
      );
    } else {
      const filterConditions = {
        'verified': where('emailVerified', '==', true),
        'unverified': where('emailVerified', '==', false),
        'banned': where('banned', '==', true)
      };
      
      const conditions = [
        orderBy('createdAt', 'desc'),
        limit(state.usersPerPage)
      ];
      
      if (domElements.userFilter.value !== 'all') {
        conditions.unshift(filterConditions[domElements.userFilter.value]);
      }
      
      usersQuery = query(baseQuery, ...conditions);
    }
    
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      showEmptyState('#users-table-body', 'No users found');
      return;
    }
    
    domElements.usersTableBody.innerHTML = '';
    
    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      const joinedDate = user.createdAt?.toDate().toLocaleDateString() || 'N/A';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${doc.id.substring(0, 6)}...</td>
        <td>${user.name || 'N/A'}</td>
        <td>${user.email || 'N/A'}</td>
        <td>
          <span class="status-badge ${user.emailVerified ? 'verified' : 'unverified'}">
            ${user.emailVerified ? 'Verified' : 'Unverified'}
          </span>
        </td>
        <td>${user.score || 0}</td>
        <td>${joinedDate}</td>
        <td>
          <button class="action-btn small view-user" data-userid="${doc.id}">
            <i class="bx bx-show"></i>
          </button>
          <button class="action-btn small danger delete-user" data-userid="${doc.id}">
            <i class="bx bx-trash"></i>
          </button>
        </td>
      `;
      
      domElements.usersTableBody.appendChild(row);
    });
    
    updatePaginationControls();
    setupUserActionListeners();
    
  } catch (error) {
    console.error('Error loading users:', error);
    showError('#users-table-body', 'Failed to load users');
  }
}

function setupUserActionListeners() {
  document.querySelectorAll('.view-user').forEach(btn => {
    btn.addEventListener('click', (e) => viewUserDetails(e.target.closest('button').dataset.userid));
  });
  
  document.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', (e) => confirmDeleteUser(e.target.closest('button').dataset.userid));
  });
}

// Leaderboard functions
async function loadLeaderboard() {
  try {
    showLoading('#scores-table-body');
    
    const q = query(collection(db, 'users'), orderBy('score', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      showEmptyState('#scores-table-body', 'No scores found');
      return;
    }
    
    const scoresTableBody = document.getElementById('scores-table-body');
    scoresTableBody.innerHTML = '';
    
    snapshot.forEach((doc, index) => {
      const user = doc.data();
      const lastPlayed = user.lastUpdated?.toDate().toLocaleDateString() || 'N/A';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${user.name || 'N/A'}</td>
        <td>${user.email || 'N/A'}</td>
        <td>${user.score || 0}</td>
        <td>${user.favoriteDifficulty || 'N/A'}</td>
        <td>${lastPlayed}</td>
        <td>
          <button class="action-btn small view-user" data-userid="${doc.id}">
            <i class="bx bx-show"></i>
          </button>
        </td>
      `;
      
      scoresTableBody.appendChild(row);
    });
    
    document.querySelectorAll('#scores-table-body .view-user').forEach(btn => {
      btn.addEventListener('click', (e) => viewUserDetails(e.target.closest('button').dataset.userid));
    });
    
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    showError('#scores-table-body', 'Failed to load leaderboard');
  }
}

// Feedback functions
async function loadFeedback() {
  try {
    showLoading('#feedback-list');
    
    const statusConditions = {
      'unread': where('status', '==', 'unread'),
      'read': where('status', '==', 'read'),
      'resolved': where('status', '==', 'resolved')
    };
    
    const baseConditions = [
      orderBy('timestamp', 'desc')
    ];
    
    if (domElements.feedbackStatus.value !== 'all') {
      baseConditions.unshift(statusConditions[domElements.feedbackStatus.value]);
    }
    
    const feedbackQuery = query(collection(db, 'feedback'), ...baseConditions);
    const feedbackSnapshot = await getDocs(feedbackQuery);
    
    if (feedbackSnapshot.empty) {
      showEmptyState('#feedback-list', 'No feedback found');
      return;
    }
    
    domElements.feedbackList.innerHTML = '';
    
    feedbackSnapshot.forEach(doc => {
      const feedback = doc.data();
      const date = feedback.timestamp?.toDate().toLocaleString() || 'N/A';
      
      const feedbackItem = document.createElement('div');
      feedbackItem.className = `feedback-item status-${feedback.status || 'unread'}`;
      feedbackItem.innerHTML = `
        <div class="feedback-header">
          <span class="feedback-user">${feedback.name || 'Anonymous'}</span>
          <span class="feedback-date">${date}</span>
        </div>
        <div class="feedback-content">
          <p>${feedback.message}</p>
        </div>
        <div class="feedback-footer">
          <span class="feedback-status status-${feedback.status || 'unread'}">
            ${feedback.status || 'unread'}
          </span>
          <div class="feedback-actions">
            <button class="action-btn small mark-read" data-feedbackid="${doc.id}">
              <i class="bx bx-check"></i> Mark Read
            </button>
            <button class="action-btn small success resolve" data-feedbackid="${doc.id}">
              <i class="bx bx-check-double"></i> Resolve
            </button>
          </div>
        </div>
      `;
      
      domElements.feedbackList.appendChild(feedbackItem);
    });
    
    document.querySelectorAll('.mark-read').forEach(btn => {
      btn.addEventListener('click', (e) => updateFeedbackStatus(e.target.closest('button').dataset.feedbackid, 'read'));
    });
    
    document.querySelectorAll('.resolve').forEach(btn => {
      btn.addEventListener('click', (e) => updateFeedbackStatus(e.target.closest('button').dataset.feedbackid, 'resolved'));
    });
    
  } catch (error) {
    console.error('Error loading feedback:', error);
    showError('#feedback-list', 'Failed to load feedback');
  }
}

// User details modal
async function viewUserDetails(userId) {
  try {
    showLoading('#user-modal .modal-body');
    state.currentUserId = userId;
    
    const [userDoc, rankSnapshot] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDocs(query(collection(db, 'users'), orderBy('score', 'desc')))
    ]);
    
    if (!userDoc.exists()) {
      showAlert('User not found');
      closeModal(domElements.userModal);
      return;
    }
    
    const user = userDoc.data();
    
    // Update modal with user data
    document.getElementById('modal-user-name').textContent = user.name || 'N/A';
    document.getElementById('modal-user-email').textContent = user.email || 'N/A';
    document.getElementById('modal-user-score').textContent = user.score || 0;
    document.getElementById('modal-user-joined').textContent = user.createdAt?.toDate().toLocaleDateString() || 'N/A';
    
    // Calculate rank
    let rank = 1;
    let userRank = '-';
    rankSnapshot.forEach(doc => {
      if (doc.id === userId) userRank = rank;
      rank++;
    });
    document.getElementById('modal-user-rank').textContent = userRank;
    
    // Update verify button
    const verifyBtn = domElements.verifyUserBtn;
    if (user.emailVerified) {
      verifyBtn.innerHTML = '<i class="bx bx-x-circle"></i> Unverify Email';
      verifyBtn.classList.add('danger');
    } else {
      verifyBtn.innerHTML = '<i class="bx bx-check-circle"></i> Verify Email';
      verifyBtn.classList.remove('danger');
    }
    
    // Update ban button
    const banBtn = domElements.banUserBtn;
    if (user.banned) {
      banBtn.innerHTML = '<i class="bx bx-check-circle"></i> Unban User';
      banBtn.classList.remove('danger');
    } else {
      banBtn.innerHTML = '<i class="bx bx-block"></i> Ban User';
      banBtn.classList.add('danger');
    }
    
    domElements.userModal.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error loading user details:', error);
    showAlert('Failed to load user details');
    closeModal(domElements.userModal);
  }
}

// Chart functions
function initCharts() {
  // Destroy existing charts if they exist
  if (state.charts.registrations) state.charts.registrations.destroy();
  if (state.charts.difficulty) state.charts.difficulty.destroy();
  
  // Registration chart
  const registrationsCtx = document.getElementById('registrations-chart').getContext('2d');
  state.charts.registrations = new Chart(registrationsCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'User Registrations',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(108, 92, 231, 0.2)',
        borderColor: 'rgba(108, 92, 231, 1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // Difficulty chart
  const difficultyCtx = document.getElementById('difficulty-chart').getContext('2d');
  state.charts.difficulty = new Chart(difficultyCtx, {
    type: 'doughnut',
    data: {
      labels: ['Easy', 'Medium', 'Hard'],
      datasets: [{
        data: [300, 150, 100],
        backgroundColor: [
          'rgba(0, 184, 148, 0.7)',
          'rgba(253, 203, 110, 0.7)',
          'rgba(225, 112, 85, 0.7)'
        ],
        borderColor: [
          'rgba(0, 184, 148, 1)',
          'rgba(253, 203, 110, 1)',
          'rgba(225, 112, 85, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        }
      }
    }
  });
}

// Data export functions
async function exportScoresToCSV() {
  try {
    showAlert('Preparing CSV export...');
    
    const q = query(collection(db, 'users'), orderBy('score', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Rank,Name,Email,Score,Difficulty,Last Played\n";
    
    snapshot.forEach((doc, index) => {
      const user = doc.data();
      csvContent += `${index + 1},${user.name || ''},${user.email || ''},${user.score || 0},${user.favoriteDifficulty || ''},${user.lastUpdated?.toDate().toLocaleDateString() || ''}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leaderboard_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error exporting scores:', error);
    showAlert('Failed to export scores');
  }
}

// Action functions
async function updateFeedbackStatus(feedbackId, status) {
  try {
    await updateDoc(doc(db, 'feedback', feedbackId), { status });
    showAlert(`Feedback marked as ${status}`);
    loadFeedback();
  } catch (error) {
    console.error('Error updating feedback status:', error);
    showAlert('Failed to update feedback status');
  }
}

function confirmDeleteUser(userId) {
  state.currentUserId = userId;
  document.getElementById('confirm-title').textContent = 'Delete User';
  document.getElementById('confirm-message').textContent = 'Are you sure you want to delete this user account? This action cannot be undone.';
  
  state.confirmAction = async () => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      showAlert('User deleted successfully');
      loadUsersTable();
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting user:', error);
      showAlert('Failed to delete user');
    }
    closeConfirmModal();
  };
  
  domElements.confirmModal.classList.remove('hidden');
}

function confirmResetScores() {
  document.getElementById('confirm-title').textContent = 'Reset All Scores';
  document.getElementById('confirm-message').textContent = 'Are you sure you want to reset ALL user scores? This action cannot be undone.';
  
  state.confirmAction = async () => {
    try {
      showAlert('Resetting scores...');
      
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const batch = writeBatch(db);
      usersSnapshot.forEach(userDoc => {
        batch.update(doc(db, 'users', userDoc.id), { score: 0 });
      });
      
      await batch.commit();
      showAlert('All scores have been reset');
      loadDashboardData();
      loadLeaderboard();
    } catch (error) {
      console.error('Error resetting scores:', error);
      showAlert('Failed to reset scores');
    }
    closeConfirmModal();
  };
  
  domElements.confirmModal.classList.remove('hidden');
}

// Real-time updates
function initRealTimeUpdates() {
  // Clean up existing listeners
  if (state.unsubscribeUsers) state.unsubscribeUsers();
  if (state.unsubscribeFeedback) state.unsubscribeFeedback();
  
  // Users listener
  const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
  state.unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
    state.totalUsers = snapshot.size;
    document.getElementById('total-users').textContent = state.totalUsers.toLocaleString();
    
    if (!document.getElementById('users-section').classList.contains('hidden')) {
      loadUsersTable();
    }
  });
  
  // Feedback listener
  const feedbackQuery = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'), limit(50));
  state.unsubscribeFeedback = onSnapshot(feedbackQuery, () => {
    if (!document.getElementById('feedback-section').classList.contains('hidden')) {
      loadFeedback();
    }
  });
}

// UI helper functions
function updatePaginationControls() {
  const totalPages = Math.ceil(state.totalUsers / state.usersPerPage);
  
  domElements.pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
  domElements.prevPageBtn.disabled = state.currentPage === 1;
  domElements.nextPageBtn.disabled = state.currentPage === totalPages || totalPages === 0;
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

function closeConfirmModal() {
  closeModal(domElements.confirmModal);
}

function showAlert(message) {
  // In production, replace with a proper notification system
  alert(message);
}

function showLoading(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = `
      <div class="loading-state">
        <i class="bx bx-loader-circle bx-spin"></i>
        <span>Loading...</span>
      </div>
    `;
  }
}

function showEmptyState(selector, message) {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = `
      <div class="empty-state">
        <i class="bx bx-info-circle"></i>
        <span>${message}</span>
      </div>
    `;
  }
}

function showError(selector, message) {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = `
      <div class="error-state">
        <i class="bx bx-error-circle"></i>
        <span>${message}</span>
      </div>
    `;
  }
}

// Event listeners setup
function setupEventListeners() {
  // Admin menu navigation
  domElements.adminMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      domElements.adminMenuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      domElements.adminSections.forEach(section => section.classList.add('hidden'));
      
      const sectionId = `${item.dataset.section}-section`;
      document.getElementById(sectionId).classList.remove('hidden');
      document.getElementById('admin-section-title').textContent = item.querySelector('span').textContent;
    });
  });
  
  // Dark mode toggle
  domElements.darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  });
  
  // Logout
  domElements.logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error signing out:', error);
      showAlert('Failed to logout');
    }
  });
  
  // Refresh data
  domElements.refreshBtn.addEventListener('click', async () => {
    await Promise.all([
      loadDashboardData(),
      loadUsersTable(),
      loadFeedback(),
      loadLeaderboard()
    ]);
    showAlert('Data refreshed');
  });
  
  // User search and filter
  domElements.userSearch.addEventListener('input', () => {
    state.currentPage = 1;
    loadUsersTable();
  });
  
  domElements.userFilter.addEventListener('change', () => {
    state.currentPage = 1;
    loadUsersTable();
  });
  
  // Feedback filter
  domElements.feedbackStatus.addEventListener('change', loadFeedback);
  
  // Pagination controls
  domElements.prevPageBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      loadUsersTable();
    }
  });
  
  domElements.nextPageBtn.addEventListener('click', () => {
    state.currentPage++;
    loadUsersTable();
  });
  
  // Export scores
  domElements.exportScoresBtn.addEventListener('click', exportScoresToCSV);
  
  // Reset scores
  domElements.resetScoresBtn.addEventListener('click', confirmResetScores);
  
  // Modal close buttons
  domElements.closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
  });
  
  domElements.cancelModalBtns.forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
  });
  
  // Confirm action button
  domElements.confirmActionBtn.addEventListener('click', () => {
    if (state.confirmAction) {
      state.confirmAction();
    }
  });
  
  // User actions in modal
  domElements.verifyUserBtn.addEventListener('click', async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', state.currentUserId));
      const currentStatus = userDoc.data().emailVerified;
      
      await updateDoc(doc(db, 'users', state.currentUserId), {
        emailVerified: !currentStatus
      });
      
      showAlert(`User email ${!currentStatus ? 'verified' : 'unverified'}`);
      viewUserDetails(state.currentUserId);
      loadUsersTable();
    } catch (error) {
      console.error('Error updating verification status:', error);
      showAlert('Failed to update verification status');
    }
  });
  
  domElements.banUserBtn.addEventListener('click', async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', state.currentUserId));
      const currentStatus = userDoc.data().banned || false;
      
      await updateDoc(doc(db, 'users', state.currentUserId), {
        banned: !currentStatus
      });
      
      showAlert(`User ${!currentStatus ? 'banned' : 'unbanned'}`);
      viewUserDetails(state.currentUserId);
      loadUsersTable();
    } catch (error) {
      console.error('Error updating ban status:', error);
      showAlert('Failed to update ban status');
    }
  });
  
  domElements.resetPasswordBtn.addEventListener('click', async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', state.currentUserId));
      const userEmail = userDoc.data().email;
      
      if (!userEmail) {
        showAlert('User has no email address');
        return;
      }
      
      await sendPasswordResetEmail(auth, userEmail);
      showAlert(`Password reset email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      showAlert('Failed to send password reset');
    }
  });
  
  domElements.deleteUserBtn.addEventListener('click', () => {
    confirmDeleteUser(state.currentUserId);
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === domElements.userModal) closeModal(domElements.userModal);
    if (e.target === domElements.confirmModal) closeModal(domElements.confirmModal);
  });
  
  // Clean up when leaving page
  window.addEventListener('beforeunload', () => {
    if (state.unsubscribeUsers) state.unsubscribeUsers();
    if (state.unsubscribeFeedback) state.unsubscribeFeedback();
  });
}