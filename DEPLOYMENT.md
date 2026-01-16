# Deploying Roommate Task Manager Backend

## Quick Deploy Options

### Option 1: Render.com (Recommended - Free Tier)

1. **Create Account**: Go to [render.com](https://render.com) and sign up
2. **New Web Service**: Click "New +" → "Web Service"
3. **Connect Repository**: 
   - Option A: Connect your GitHub repo
   - Option B: Deploy from this directory
4. **Configuration**:
   - Name: `roommate-tasks-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: `Free`
5. **Deploy**: Click "Create Web Service"
6. **Get URL**: Copy your service URL (e.g., `https://roommate-tasks-backend.onrender.com`)

### Option 2: Railway.app (Easy Alternative)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo" or "Empty Project"
4. Railway will auto-detect Node.js and deploy
5. Get your deployment URL

### Option 3: Google Cloud Run (Manual)

Since MCP credentials aren't configured, you can deploy manually:

1. Install Google Cloud SDK
2. Run:
```bash
gcloud init
gcloud run deploy roommate-tasks --source . --region us-central1 --allow-unauthenticated
```

## After Deployment

1. **Copy your deployment URL** (e.g., `https://your-app.onrender.com`)

2. **Update the mobile app**:
   - Open `public/config.js`
   - Replace the API_BASE URL:
   ```javascript
   API_BASE: 'https://your-app.onrender.com/api'
   ```

3. **Sync to Android**:
   ```bash
   npm run sync
   ```

4. **Build APK**:
   - Open Android Studio: `npm run android`
   - Build → Generate Signed Bundle / APK
   - Select APK
   - Create keystore if needed
   - Build release APK

## Testing

Test your deployed backend:
```bash
curl https://your-app.onrender.com/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## Important Notes

- **Database**: SQLite will be created automatically on first run
- **Persistence**: On Render free tier, database resets on sleep. Consider upgrading or using external DB for production
- **CORS**: Already configured to allow all origins
- **Environment**: Set `NODE_ENV=production` in deployment settings
