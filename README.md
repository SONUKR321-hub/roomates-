# Roommate Task Manager - Backend

Node.js backend server for the Roommate Task Manager mobile app.

## Features
- User authentication with mobile numbers
- Task management and assignment
- Monthly task rotation
- Monthly performance reports
- SQLite database

## Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)

## Installation
```bash
npm install
```

## Running
```bash
npm start
```

## API Endpoints
- POST /api/login - User login
- POST /api/logout - User logout
- GET /api/tasks/current - Get current month tasks
- POST /api/tasks/complete - Complete a task
- GET /api/reports/current - Get current month report
- GET /api/users/status - Get all users status

## Database
Uses SQLite with automatic initialization on first run.
