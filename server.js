// Time: O(1) for most endpoints, Space: O(n) for session storage
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cron = require('node-cron');
const {
    initializeDatabase,
    createDefaultUsers,
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
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'roommate-task-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true
    }
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// Task rotation algorithm - Round-robin with fairness
// Time: O(1), Space: O(1)
const ROOMMATES = ['deepanshu', 'sonu', 'sachin', 'sintu'];
const TASKS = ['Kachra Fekna', 'Pani Lana'];

function calculateMonthlyAssignments(month, year) {
    // Use month+year as seed for consistent rotation
    const seed = (year * 12) + month;

    const assignments = {};
    TASKS.forEach((task, taskIndex) => {
        // Rotate based on seed and task index
        const roommateIndex = (seed + taskIndex) % ROOMMATES.length;
        assignments[task] = ROOMMATES[roommateIndex];
    });

    return assignments;
}

// Initialize monthly tasks if they don't exist
async function ensureMonthlyTasks() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
        const existingTasks = await getCurrentMonthTasks();

        if (existingTasks.length === 0) {
            console.log(`📅 Creating tasks for ${month}/${year}`);
            const assignments = calculateMonthlyAssignments(month, year);
            await createMonthlyTasks(month, year, assignments);
            console.log('✅ Monthly tasks created:', assignments);
        }
    } catch (err) {
        console.error('Error ensuring monthly tasks:', err);
    }
}

// Cron job: Check and create new month's tasks at midnight on 1st
// Runs at 00:01 on the 1st of every month
cron.schedule('1 0 1 * *', async () => {
    console.log('🔄 Monthly rotation triggered');
    await ensureMonthlyTasks();
});

// Cron job: Generate monthly reports on last day of month
// Runs at 23:55 on the last day of each month
cron.schedule('55 23 28-31 * *', async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if tomorrow is the 1st (meaning today is last day of month)
    if (tomorrow.getDate() === 1) {
        console.log('📊 Generating monthly reports...');
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        try {
            const reports = await generateAllMonthlyReports(month, year);
            console.log(`✅ Generated ${reports.length} monthly reports for ${month}/${year}`);
        } catch (err) {
            console.error('❌ Error generating monthly reports:', err);
        }
    }
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { mobileNumber, password } = req.body;

        if (!mobileNumber || !password) {
            return res.status(400).json({ error: 'Mobile number and password required' });
        }

        const user = await authenticateUser(mobileNumber, password);
        req.session.user = user;

        res.json({
            success: true,
            user: {
                username: user.username,
                mobileNumber: user.mobileNumber,
                userId: user.id
            }
        });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Get current user
app.get('/api/user', requireAuth, (req, res) => {
    res.json({ user: req.session.user });
});

// Get current month's tasks
app.get('/api/tasks/current', requireAuth, async (req, res) => {
    try {
        const tasks = await getCurrentMonthTasks();
        const now = new Date();

        res.json({
            tasks,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            monthName: now.toLocaleString('default', { month: 'long' })
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users' status
app.get('/api/users/status', requireAuth, async (req, res) => {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const status = await getAllUsersStatus(month, year);
        res.json({ status, month, year });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Complete a task
app.post('/api/tasks/complete', requireAuth, async (req, res) => {
    try {
        const { taskName } = req.body;
        const username = req.session.user.username;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        if (!taskName) {
            return res.status(400).json({ error: 'Task name required' });
        }

        await completeTask(taskName, username, month, year);
        res.json({ success: true, message: 'Task completed!' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get task history
app.get('/api/history', requireAuth, async (req, res) => {
    try {
        const history = await getTaskHistory(50);
        res.json({ history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current month's report for logged-in user
app.get('/api/reports/current', requireAuth, async (req, res) => {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const userId = req.session.user.id;

        let report = await getMonthlyReport(userId, month, year);

        // If report doesn't exist, generate it
        if (!report) {
            report = await generateMonthlyReport(userId, req.session.user.username, month, year);
        }

        res.json({ report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's report history
app.get('/api/reports/history', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const limit = parseInt(req.query.limit) || 12;

        const reports = await getUserMonthlyReports(userId, limit);
        res.json({ reports });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users' reports for a specific month (admin view)
app.get('/api/reports/all', requireAuth, async (req, res) => {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const reports = await getAllMonthlyReports(month, year);
        res.json({ reports, month, year });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manually trigger report generation (for testing)
app.post('/api/reports/generate', requireAuth, async (req, res) => {
    try {
        const { month, year } = req.body;
        const targetMonth = month || new Date().getMonth() + 1;
        const targetYear = year || new Date().getFullYear();

        const reports = await generateAllMonthlyReports(targetMonth, targetYear);
        res.json({ success: true, reports, message: `Generated ${reports.length} reports` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Initialize and start server
async function startServer() {
    try {
        console.log('🚀 Initializing Roommate Task Manager...');

        await initializeDatabase();
        console.log('✅ Database initialized');

        await createDefaultUsers();
        console.log('✅ Default users created');

        await ensureMonthlyTasks();
        console.log('✅ Monthly tasks ensured');

        app.listen(PORT, () => {
            console.log(`\n🎉 Server running on http://localhost:${PORT}`);
            console.log(`📱 Open the app in your browser\n`);
            console.log('Default users (Mobile Number / Password):');
            console.log('  - 7280892805 / deep123 (Deepanshu)');
            console.log('  - 8210658796 / sonu123 (Sonu)');
            console.log('  - 9162130124 / sachin123 (Sachin)');
            console.log('  - 9142018096 / sintu123 (Sintu)\n');
        });
    } catch (err) {
        console.error('❌ Server initialization failed:', err);
        process.exit(1);
    }
}

startServer();
