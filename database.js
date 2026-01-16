const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_FILE = path.join(__dirname, 'data.json');

// Initial state
const initialState = {
  users: [],
  tasks: [],
  monthly_reports: []
};

// Helper to read DB
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2));
    return initialState;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Helper to write DB
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function initializeDatabase() {
  readDB(); // Ensure file exists
  return true;
}

async function createDefaultUsers() {
  const data = readDB();
  if (data.users.length > 0) return;

  const defaultUsers = [
    { id: 1, username: 'deepanshu', password: 'deep123' },
    { id: 2, username: 'sonu', password: 'sonu123' },
    { id: 3, username: 'sachin', password: 'sachin123' },
    { id: 4, username: 'sintu', password: 'sintu123' }
  ];

  for (const user of defaultUsers) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(user.password, salt);
    delete user.password;
    data.users.push(user);
  }
  writeDB(data);
}

async function authenticateUser(username, password) {
  const data = readDB();
  const user = data.users.find(u => u.username === username.toLowerCase());

  if (!user) throw new Error('Invalid username or password');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error('Invalid username or password');

  return { id: user.id, username: user.username };
}

async function getCurrentMonthTasks() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const data = readDB();
  return data.tasks.filter(t => t.month === month && t.year === year);
}

async function createMonthlyTasks(month, year, assignments) {
  const data = readDB();
  const newTasks = Object.entries(assignments).map(([name, roommate], index) => ({
    id: Date.now() + index,
    name,
    assigned_to: roommate,
    month,
    year,
    status: 'pending',
    completed_at: null
  }));

  data.tasks.push(...newTasks);
  writeDB(data);
  return newTasks;
}

async function completeTask(taskId) {
  const data = readDB();
  const task = data.tasks.find(t => t.id === parseInt(taskId));
  if (task) {
    task.status = 'completed';
    task.completed_at = new Date().toISOString();
    writeDB(data);
    return true;
  }
  return false;
}

async function getAllUsersStatus() {
  const data = readDB();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return data.users.map(user => {
    const userTasks = data.tasks.filter(t =>
      t.assigned_to === user.username &&
      t.month === month &&
      t.year === year
    );
    return {
      username: user.username,
      pendingTasks: userTasks.filter(t => t.status === 'pending').length,
      completedTasks: userTasks.filter(t => t.status === 'completed').length
    };
  });
}

async function getTaskHistory(limit = 10) {
  const data = readDB();
  return data.tasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, limit);
}

async function generateAllMonthlyReports(month, year) {
  const data = readDB();
  const reports = data.users.map(user => {
    const userTasks = data.tasks.filter(t =>
      t.assigned_to === user.username &&
      t.month === month &&
      t.year === year
    );

    const assignedCount = userTasks.length;
    const completedCount = userTasks.filter(t => t.status === 'completed').length;
    const completionRate = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 100;

    const report = {
      id: Date.now() + Math.random(),
      user_id: user.id,
      username: user.username,
      month,
      year,
      assigned_tasks: assignedCount,
      completed_tasks: completedCount,
      completion_percentage: completionRate,
      report_data: JSON.stringify({ tasks: userTasks }),
      created_at: new Date().toISOString()
    };

    data.monthly_reports.push(report);
    return report;
  });

  writeDB(data);
  return reports;
}

async function getMonthlyReport(userId, month, year) {
  const data = readDB();
  return data.monthly_reports.find(r =>
    r.user_id === parseInt(userId) &&
    r.month === month &&
    r.year === year
  );
}

async function getUserMonthlyReports(userId, limit = 12) {
  const data = readDB();
  return data.monthly_reports
    .filter(r => r.user_id === parseInt(userId))
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, limit);
}

async function getAllMonthlyReports(month, year) {
  const data = readDB();
  return data.monthly_reports.filter(r => r.month === month && r.year === year);
}

module.exports = {
  initializeDatabase,
  createDefaultUsers,
  authenticateUser,
  getCurrentMonthTasks,
  createMonthlyTasks,
  completeTask,
  getAllUsersStatus,
  getTaskHistory,
  generateAllMonthlyReports,
  getMonthlyReport,
  getUserMonthlyReports,
  getAllMonthlyReports
};
