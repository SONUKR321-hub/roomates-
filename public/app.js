// ============================================
// ROOMMATE TASK MANAGER - FRONTEND APP
// Time Complexity: O(n) for rendering, O(1) for API calls
// Space Complexity: O(n) for storing task data
// ============================================

const API_BASE = window.APP_CONFIG?.API_BASE || 'http://localhost:3000/api';

// State management
const state = {
  currentUser: null,
  tasks: [],
  usersStatus: [],
  history: [],
  currentMonth: '',
  currentYear: 0
};

// DOM Elements
const elements = {
  loginScreen: document.getElementById('loginScreen'),
  dashboardScreen: document.getElementById('dashboardScreen'),
  loginForm: document.getElementById('loginForm'),
  loginError: document.getElementById('loginError'),
  logoutBtn: document.getElementById('logoutBtn'),
  welcomeText: document.getElementById('welcomeText'),
  monthText: document.getElementById('monthText'),
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  errorText: document.getElementById('errorText'),
  retryBtn: document.getElementById('retryBtn'),
  tasksContainer: document.getElementById('tasksContainer'),
  currentTasks: document.getElementById('currentTasks'),
  usersStatus: document.getElementById('usersStatus'),
  historyContainer: document.getElementById('historyContainer'),
  toggleHistory: document.getElementById('toggleHistory'),
  refreshBtn: document.getElementById('refreshBtn'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, duration = 3000) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.remove('hidden');
  elements.toast.classList.add('show');

  setTimeout(() => {
    elements.toast.classList.remove('show');
    setTimeout(() => elements.toast.classList.add('hidden'), 300);
  }, duration);
}

function showScreen(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if (screenName === 'login') {
    elements.loginScreen.classList.add('active');
  } else if (screenName === 'dashboard') {
    elements.dashboardScreen.classList.add('active');
  }
}

function showLoading() {
  elements.loadingState.classList.remove('hidden');
  elements.errorState.classList.add('hidden');
  elements.tasksContainer.classList.add('hidden');
}

function showError(message) {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.remove('hidden');
  elements.tasksContainer.classList.add('hidden');
  elements.errorText.textContent = message;
}

function showContent() {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.tasksContainer.classList.remove('hidden');
}

// ============================================
// API FUNCTIONS
// ============================================

async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

async function login(username, password) {
  return apiCall('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

async function logout() {
  return apiCall('/logout', { method: 'POST' });
}

async function getCurrentTasks() {
  return apiCall('/tasks/current');
}

async function getUsersStatus() {
  return apiCall('/users/status');
}

async function completeTask(taskName) {
  return apiCall('/tasks/complete', {
    method: 'POST',
    body: JSON.stringify({ taskName })
  });
}

async function getHistory() {
  return apiCall('/history');
}

// ============================================
// AUTHENTICATION HANDLERS
// ============================================

elements.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    elements.loginError.textContent = 'Please enter username and password';
    elements.loginError.classList.remove('hidden');
    return;
  }

  elements.loginError.classList.add('hidden');
  const loginBtn = e.target.querySelector('button[type="submit"]');
  const originalText = loginBtn.textContent;
  loginBtn.textContent = 'Logging in...';
  loginBtn.classList.add('btn-loader');

  try {
    const data = await login(username, password);
    state.currentUser = data.user;
    showDashboard();
    await loadDashboardData();

  } catch (error) {
    elements.loginError.textContent = error.message;
    elements.loginError.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// Quick login chips
document.querySelectorAll('.user-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const username = chip.dataset.username;
    const password = chip.dataset.password;
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    document.getElementById('username').focus();
  });
});

elements.logoutBtn.addEventListener('click', async () => {
  try {
    await logout();
    state.currentUser = null;
    state.tasks = [];
    state.usersStatus = [];
    showScreen('login');
    elements.loginForm.reset();
    showToast('Logged out successfully');
  } catch (error) {
    showToast('Logout failed: ' + error.message);
  }
});

// ============================================
// DASHBOARD DATA LOADING
// ============================================

async function loadDashboardData() {
  showLoading();

  try {
    // Parallel API calls for better performance
    const [tasksData, statusData] = await Promise.all([
      getCurrentTasks(),
      getUsersStatus()
    ]);

    state.tasks = tasksData.tasks;
    state.currentMonth = tasksData.monthName;
    state.currentYear = tasksData.year;
    state.usersStatus = statusData.status;

    // Update UI
    elements.monthText.textContent = `${state.currentMonth} ${state.currentYear}`;
    renderCurrentTasks();
    renderUsersStatus();

    showContent();
  } catch (error) {
    showError('Failed to load data: ' + error.message);
  }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderCurrentTasks() {
  if (state.tasks.length === 0) {
    elements.currentTasks.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <p>No tasks assigned for this month yet.</p>
      </div>
    `;
    return;
  }

  elements.currentTasks.innerHTML = state.tasks.map(task => {
    const isAssignedToMe = task.assigned_to === state.currentUser;
    const isCompleted = Boolean(task.completed);

    return `
      <div class="task-card ${isCompleted ? 'completed' : ''}" style="animation-delay: ${Math.random() * 0.2}s">
        <div class="task-header">
          <div class="task-info">
            <h4>${task.name}</h4>
            <div class="task-assignee">
              <span>${isAssignedToMe ? '👤 You' : '👤 ' + capitalizeFirst(task.assigned_to)}</span>
            </div>
          </div>
          <span class="status-badge ${isCompleted ? 'completed' : 'pending'}">
            ${isCompleted ? '✓ Done' : '⏳ Pending'}
          </span>
        </div>
        
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05);">
          📅 Assigned for: <strong>${state.currentMonth} ${state.currentYear}</strong>
        </div>
        
        ${isAssignedToMe && !isCompleted ? `
          <div class="task-actions">
            <button class="btn btn-success" onclick="handleCompleteTask('${task.name}')">
              Mark Complete
            </button>
          </div>
        ` : ''}
        
        ${isCompleted ? `
          <div style="font-size: 0.85rem; color: var(--success); margin-top: 0.75rem; padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-radius: var(--radius-sm);">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">✓ Completed</div>
            <div style="color: var(--text-secondary);">${formatDate(task.completed_at)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderUsersStatus() {
  if (state.usersStatus.length === 0) {
    elements.usersStatus.innerHTML = '<p style="color: var(--text-secondary);">No status data available.</p>';
    return;
  }

  elements.usersStatus.innerHTML = state.usersStatus.map((user, index) => {
    const totalTasks = user.tasks.length;
    const completedTasks = user.tasks.filter(t => t.completed).length;
    const hasIncomplete = completedTasks < totalTasks;

    return `
      <div class="user-card ${hasIncomplete ? 'alert' : ''}" style="animation-delay: ${index * 0.1}s">
        <div class="user-header">
          <div class="user-name">${capitalizeFirst(user.username)}</div>
          <div class="completion-badge">
            ${completedTasks}/${totalTasks} tasks
          </div>
        </div>
        
        <div class="user-tasks">
          ${user.tasks.length > 0 ? user.tasks.map(task => `
            <div class="user-task-item">
              <span class="task-icon">${task.completed ? '✅' : '⏳'}</span>
              <div style="flex: 1;">
                <div>${task.name}</div>
                ${task.completed ? `<div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">${formatDate(task.completedAt)}</div>` : ''}
              </div>
            </div>
          `).join('') : '<div style="color: var(--text-tertiary); font-size: 0.9rem;">No tasks assigned</div>'}
        </div>
      </div>
    `;
  }).join('');
}

async function loadHistory() {
  try {
    const data = await getHistory();
    state.history = data.history;

    if (state.history.length === 0) {
      elements.historyContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">No activity yet.</p>';
      return;
    }

    elements.historyContainer.innerHTML = state.history.map(item => `
      <div class="history-item">
        <div>
          <strong>${capitalizeFirst(item.username)}</strong> ${item.action} 
          <strong>${item.task_name}</strong> (${item.month}/${item.year})
        </div>
        <div class="history-time">${formatDate(item.timestamp)}</div>
      </div>
    `).join('');
  } catch (error) {
    elements.historyContainer.innerHTML = `<p style="color: var(--danger);">Failed to load history</p>`;
  }
}

async function loadMonthlyReport() {
  try {
    const data = await getCurrentReport();
    const report = data.report;

    if (!report) {
      elements.reportContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">No report available yet.</p>';
      return;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[report.month - 1];

    elements.reportContainer.innerHTML = `
      <div class="report-card">
        <div class="report-header">
          <h4>\ud83d\udcc5 ${monthName} ${report.year} Performance</h4>
          <div class="report-date">Generated: ${formatDate(report.created_at)}</div>
        </div>
        
        <div class="report-stats">
          <div class="stat-card">
            <div class="stat-value">${report.tasks_assigned}</div>
            <div class="stat-label">Tasks Assigned</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">${report.tasks_completed}</div>
            <div class="stat-label">Tasks Completed</div>
          </div>
          
          <div class="stat-card ${report.completion_percentage === 100 ? 'stat-success' : ''}">
            <div class="stat-value">${report.completion_percentage}%</div>
            <div class="stat-label">Completion Rate</div>
          </div>
        </div>
        
        ${report.report_data && report.report_data.tasks ? `
          <div class="report-tasks">
            <h5>Task Details:</h5>
            ${report.report_data.tasks.map(task => `
              <div class="report-task-item">
                <span class="task-icon">${task.completed ? '\u2705' : '\u23f3'}</span>
                <div style="flex: 1;">
                  <div>${task.name}</div>
                  ${task.completed ? `<div style="font-size: 0.75rem; color: var(--text-tertiary);">${formatDate(task.completedAt)}</div>` : '<div style="font-size: 0.75rem; color: var(--warning);">Pending</div>'}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } catch (error) {
    elements.reportContainer.innerHTML = `<p style="color: var(--danger);">Failed to load report</p>`;
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleCompleteTask(taskName) {
  if (!confirm(`Mark "${taskName}" as complete?`)) {
    return;
  }

  try {
    await completeTask(taskName);
    showToast('✅ Task completed!');
    await loadDashboardData();
  } catch (error) {
    showToast('❌ ' + error.message);
  }
}

elements.refreshBtn.addEventListener('click', async () => {
  elements.refreshBtn.style.transform = 'rotate(360deg)';
  await loadDashboardData();
  setTimeout(() => {
    elements.refreshBtn.style.transform = '';
  }, 300);
});

elements.retryBtn.addEventListener('click', loadDashboardData);

elements.toggleHistory.addEventListener('click', async () => {
  const isHidden = elements.historyContainer.classList.contains('hidden');

  if (isHidden) {
    elements.toggleHistory.textContent = 'Hide';
    elements.historyContainer.classList.remove('hidden');
    if (state.history.length === 0) {
      await loadHistory();
    }
  } else {
    elements.toggleHistory.textContent = 'Show';
    elements.historyContainer.classList.add('hidden');
  }
});

elements.toggleReport.addEventListener('click', async () => {
  const isHidden = elements.reportContainer.classList.contains('hidden');

  if (isHidden) {
    elements.toggleReport.textContent = 'Hide';
    elements.reportContainer.classList.remove('hidden');
    await loadMonthlyReport();
  } else {
    elements.toggleReport.textContent = 'Show';
    elements.reportContainer.classList.add('hidden');
  }
});

// ============================================
// UTILITY HELPERS
// ============================================

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);

  // Format: "Jan 16, 2026 at 9:30 PM"
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  return date.toLocaleString('en-US', options).replace(',', ' at');
}

// ============================================
// AUTO-REFRESH
// ============================================

// Auto-refresh every 30 seconds when dashboard is visible
setInterval(() => {
  if (!elements.dashboardScreen.classList.contains('active')) return;
  if (elements.loadingState.classList.contains('hidden') &&
    elements.errorState.classList.contains('hidden')) {
    loadDashboardData();
  }
}, 30000);

// ============================================
// INITIALIZATION
// ============================================

console.log('🏠 Roommate Task Manager initialized');
console.log('📱 Mobile-optimized interface ready');
