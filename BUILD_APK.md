# Building Android APK - Step by Step Guide

## Prerequisites

1. **Android Studio** installed
   - Download from: https://developer.android.com/studio
   - Install with default settings

2. **Java JDK** (usually comes with Android Studio)

## Steps to Build APK

### 1. Open Project in Android Studio

```bash
npm run android
```

This will open the Android project in Android Studio.

**Alternative**: Manually open Android Studio → Open → Select `android/` folder

### 2. Wait for Gradle Sync

- Android Studio will automatically sync Gradle files
- Wait for "Gradle sync finished" message (bottom right)
- This may take 5-10 minutes on first run

### 3. Create Signing Key (First Time Only)

1. In Android Studio: **Build** → **Generate Signed Bundle / APK**
2. Select **APK** → Click **Next**
3. Click **Create new...** (Key store path)
4. Fill in details:
   - **Key store path**: Choose location (e.g., `roommate-tasks-key.jks`)
   - **Password**: Create a strong password
   - **Alias**: `roommate-tasks`
   - **Alias Password**: Same or different password
   - **Validity**: 25 years
   - **Certificate**: Fill your details
5. Click **OK** → **Next**

### 4. Build Release APK

1. Select **release** build variant
2. Check both signature versions (V1 and V2)
3. Click **Finish**
4. Wait for build to complete (2-5 minutes)

### 5. Locate Your APK

APK will be in: `android/app/release/app-release.apk`

Android Studio will show a notification with "locate" link.

## Install on Phone

### Method 1: Direct Install (USB)

1. Enable **Developer Options** on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB
4. In Android Studio: **Run** → **Run 'app'**
5. Select your device from list

### Method 2: Transfer APK

1. Copy `app-release.apk` to your phone
2. Open file on phone
3. Allow "Install from Unknown Sources" if prompted
4. Install the app

## Troubleshooting

**Gradle Sync Failed**:
- File → Invalidate Caches → Restart
- Check internet connection

**Build Failed**:
- Check Android Studio error messages
- Ensure JDK is properly installed
- Try: Build → Clean Project → Rebuild Project

**App Won't Install**:
- Uninstall old version first
- Check phone storage space
- Ensure "Unknown Sources" is enabled

## Quick Build (Command Line)

For faster builds without Android Studio:

```bash
cd android
./gradlew assembleRelease
```

APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

## Next Steps

After installing:
1. Open the app
2. Login with mobile number (e.g., 7280892805 / deep123)
3. Test all features
4. Share APK with roommates!
