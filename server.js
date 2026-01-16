const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const {
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

app.use(session({
    secret: process.env.SESSION_SECRET || 'roommate-task-manager-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

const ROOMMATES = ['deepanshu', 'sonu', 'sachin', 'sintu'];
const TASKS = ['Kitchen Cleaning', 'Bathroom Cleaning', 'Hall Sweeping', 'Trash Removal'];

function calculateMonthlyAssignments(month, year) {
    const seed = (year * 12) + month;
    const assignments = {};
    TASKS.forEach((task, taskIndex) => {
        const roommateIndex = (seed + taskIndex) % ROOMMATES.length;
        assignments[task] = ROOMMATES[roommateIndex];
    });
    return assignments;
}

// Function to ensure monthly tasks exist
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

// ============================================
// CRON JOBS
// ============================================

// Check and create tasks at midnight on 1st
cron.schedule('1 0 1 * *', async () => {
    console.log('🔄 Monthly rotation triggered');
    await ensureMonthlyTasks();
});

// Generate monthly reports on last day of month
cron.schedule('55 23 28-31 * *', async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (tomorrow.getDate() === 1) {
        console.log('📊 Generating monthly reports...');
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        try {
            const reports = await generateAllMonthlyReports(month, year);
            console.log(`✅ Generated ${reports.length} reports`);
        } catch (err) {
            console.error('❌ Error generating reports:', err);
        }
    }
});

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        const user = await authenticateUser(username, password);
        req.session.user = user;
        res.json({ success: true, user });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: 'Authentication required' });
    next();
}

app.get('/api/tasks/current', requireAuth, async (req, res) => {
    try {
        const tasks = await getCurrentMonthTasks();
        res.json({ tasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks/complete', requireAuth, async (req, res) => {
    try {
        const { taskId } = req.body;
        const success = await completeTask(taskId);
        res.json({ success });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/status', requireAuth, async (req, res) => {
    try {
        const status = await getAllUsersStatus();
        res.json({ status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history', requireAuth, async (req, res) => {
    try {
        const history = await getTaskHistory();
        res.json({ history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/current', requireAuth, async (req, res) => {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const report = await getMonthlyReport(req.session.user.id, month, year);
        res.json({ report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Server Initialization
async function startServer() {
    try {
        console.log('🚀 Initializing server...');
        await initializeDatabase();
        await createDefaultUsers();
        await ensureMonthlyTasks();

        app.listen(PORT, () => {
            console.log(`\n🎉 Server running on port ${PORT}`);
            console.log('Default users: deepanshu, sonu, sachin, sintu (Password: [name]123)\n');
        });
    } catch (err) {
        console.error('❌ Server failed:', err);
        process.exit(1);
    }
}

startServer();
