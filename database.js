// Time: O(1) for queries, Space: O(n) for data storage
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'roommates.db');
const SALT_ROUNDS = 10;

// Initialize database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Initialize database schema
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          mobile_number TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Add mobile_number column if it doesn't exist (for existing databases)
      db.run(`
        ALTER TABLE users ADD COLUMN mobile_number TEXT
      `, (err) => {
        // Ignore error if column already exists
      });

      // Tasks table
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          assigned_to TEXT NOT NULL,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          completed BOOLEAN DEFAULT 0,
          completed_at DATETIME,
          UNIQUE(name, month, year)
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Task history table
      db.run(`
        CREATE TABLE IF NOT EXISTS task_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          action TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks(id)
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Monthly reports table
      db.run(`
        CREATE TABLE IF NOT EXISTS monthly_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          tasks_assigned INTEGER DEFAULT 0,
          tasks_completed INTEGER DEFAULT 0,
          completion_percentage REAL DEFAULT 0,
          report_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, month, year),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Create default users if they don't exist
async function createDefaultUsers() {
  const defaultUsers = [
    { username: 'deepanshu', mobile: '7280892805', password: 'deep123' },
    { username: 'sonu', mobile: '8210658796', password: 'sonu123' },
    { username: 'sachin', mobile: '9162130124', password: 'sachin123' },
    { username: 'sintu', mobile: '9142018096', password: 'sintu123' }
  ];

  for (const user of defaultUsers) {
    try {
      await registerUser(user.username, user.password, user.mobile);
      console.log(`✅ Created user: ${user.username} (${user.mobile})`);
    } catch (err) {
      // User already exists, skip
      if (!err.message.includes('UNIQUE constraint')) {
        console.error(`Error creating user ${user.username}:`, err.message);
      }
    }
  }
}

// User authentication functions
function registerUser(username, password, mobileNumber) {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!username || !password || !mobileNumber) {
      return reject(new Error('Username, password, and mobile number are required'));
    }

    // Validate mobile number format (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return reject(new Error('Invalid mobile number format. Must be 10 digits.'));
    }

    bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
      if (err) return reject(err);

      db.run(
        'INSERT INTO users (username, mobile_number, password_hash) VALUES (?, ?, ?)',
        [username.toLowerCase(), mobileNumber, hash],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint')) {
              return reject(new Error('Username or mobile number already exists'));
            }
            return reject(err);
          }
          resolve({ id: this.lastID, username, mobileNumber });
        }
      );
    });
  });
}

function authenticateUser(username, password) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      (err, user) => {
        if (err) return reject(err);
        if (!user) return reject(new Error('Invalid username or password'));

        bcrypt.compare(password, user.password_hash, (err, match) => {
          if (err) return reject(err);
          if (!match) return reject(new Error('Invalid username or password'));

          resolve({ id: user.id, username: user.username });
        });
      }
    );
  });
}

// Task management functions
function getCurrentMonthTasks() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM tasks WHERE month = ? AND year = ?',
      [month, year],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function createMonthlyTasks(month, year, assignments) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO tasks (name, assigned_to, month, year) VALUES (?, ?, ?, ?)'
    );

    for (const [taskName, username] of Object.entries(assignments)) {
      stmt.run(taskName, username, month, year);
    }

    stmt.finalize((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function completeTask(taskName, username, month, year) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE tasks 
       SET completed = 1, completed_at = CURRENT_TIMESTAMP 
       WHERE name = ? AND month = ? AND year = ? AND assigned_to = ?`,
      [taskName, month, year, username],
      function (err) {
        if (err) return reject(err);
        if (this.changes === 0) {
          return reject(new Error('Task not found or not assigned to you'));
        }

        // Log to history
        db.get(
          'SELECT id FROM tasks WHERE name = ? AND month = ? AND year = ?',
          [taskName, month, year],
          (err, task) => {
            if (err) return reject(err);

            db.run(
              'INSERT INTO task_history (task_id, username, action) VALUES (?, ?, ?)',
              [task.id, username, 'completed'],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          }
        );
      }
    );
  });
}

function getAllUsersStatus(month, year) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.username, 
              t.name as task_name, 
              t.completed, 
              t.completed_at
       FROM users u
       LEFT JOIN tasks t ON t.assigned_to = u.username 
                         AND t.month = ? 
                         AND t.year = ?
       ORDER BY u.username`,
      [month, year],
      (err, rows) => {
        if (err) return reject(err);

        // Group by username
        const userStatus = {};
        rows.forEach(row => {
          if (!userStatus[row.username]) {
            userStatus[row.username] = { username: row.username, tasks: [] };
          }
          if (row.task_name) {
            userStatus[row.username].tasks.push({
              name: row.task_name,
              completed: Boolean(row.completed),
              completedAt: row.completed_at
            });
          }
        });

        resolve(Object.values(userStatus));
      }
    );
  });
}

function getTaskHistory(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT th.*, t.name as task_name, t.month, t.year
       FROM task_history th
       JOIN tasks t ON th.task_id = t.id
       ORDER BY th.timestamp DESC
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

// Monthly report functions
function generateMonthlyReport(userId, username, month, year) {
  return new Promise((resolve, reject) => {
    // Get user's tasks for the month
    db.all(
      `SELECT * FROM tasks WHERE assigned_to = ? AND month = ? AND year = ?`,
      [username, month, year],
      (err, tasks) => {
        if (err) return reject(err);

        const tasksAssigned = tasks.length;
        const tasksCompleted = tasks.filter(t => t.completed).length;
        const completionPercentage = tasksAssigned > 0
          ? Math.round((tasksCompleted / tasksAssigned) * 100)
          : 0;

        const reportData = JSON.stringify({
          tasks: tasks.map(t => ({
            name: t.name,
            completed: Boolean(t.completed),
            completedAt: t.completed_at
          })),
          generatedAt: new Date().toISOString()
        });

        // Insert or update report
        db.run(
          `INSERT OR REPLACE INTO monthly_reports 
           (user_id, username, month, year, tasks_assigned, tasks_completed, completion_percentage, report_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, username, month, year, tasksAssigned, tasksCompleted, completionPercentage, reportData],
          function (err) {
            if (err) return reject(err);
            resolve({
              userId,
              username,
              month,
              year,
              tasksAssigned,
              tasksCompleted,
              completionPercentage,
              reportData: JSON.parse(reportData)
            });
          }
        );
      }
    );
  });
}

function generateAllMonthlyReports(month, year) {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username FROM users', async (err, users) => {
      if (err) return reject(err);

      const reports = [];
      for (const user of users) {
        try {
          const report = await generateMonthlyReport(user.id, user.username, month, year);
          reports.push(report);
        } catch (error) {
          console.error(`Error generating report for ${user.username}:`, error);
        }
      }

      resolve(reports);
    });
  });
}

function getMonthlyReport(userId, month, year) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM monthly_reports WHERE user_id = ? AND month = ? AND year = ?`,
      [userId, month, year],
      (err, report) => {
        if (err) return reject(err);
        if (!report) return resolve(null);

        resolve({
          ...report,
          report_data: JSON.parse(report.report_data)
        });
      }
    );
  });
}

function getUserMonthlyReports(userId, limit = 12) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM monthly_reports 
       WHERE user_id = ? 
       ORDER BY year DESC, month DESC 
       LIMIT ?`,
      [userId, limit],
      (err, reports) => {
        if (err) return reject(err);
        resolve(reports.map(r => ({
          ...r,
          report_data: JSON.parse(r.report_data)
        })));
      }
    );
  });
}

function getAllMonthlyReports(month, year) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM monthly_reports WHERE month = ? AND year = ? ORDER BY completion_percentage DESC`,
      [month, year],
      (err, reports) => {
        if (err) return reject(err);
        resolve(reports.map(r => ({
          ...r,
          report_data: JSON.parse(r.report_data)
        })));
      }
    );
  });
}

module.exports = {
  db,
  initializeDatabase,
  createDefaultUsers,
  registerUser,
  authenticateUser,
  getCurrentMonthTasks,
  createMonthlyTasks,
  completeTask,
  getAllUsersStatus,
  getTaskHistory,
  generateMonthlyReport,
  generateAllMonthlyReports,
  getMonthlyReport,
  getUserMonthlyReports,
  getAllMonthlyReports
};
