// Environment configuration
const config = {
    // API Base URL - will be set based on environment
    API_BASE: window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : 'https://your-app-name.onrender.com/api', // Update this after deployment

    // App version
    VERSION: '1.0.0'
};

// Export for use in app.js
window.APP_CONFIG = config;
