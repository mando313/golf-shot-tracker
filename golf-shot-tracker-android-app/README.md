# Golf Tracker Pro - Android App

A native Android app for tracking golf scores for 2-4 players with Skins, Match Play, Stroke Play, and handicap adjustments.

Built with React + Capacitor.

## Prerequisites

- **Node.js** 18+ (https://nodejs.org)
- **Android Studio** (https://developer.android.com/studio)
  - During installation, make sure to install the Android SDK (API 34+)
  - Accept all SDK license agreements

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Web Assets
```bash
npm run build
```

### 3. Sync with Android
```bash
npx cap sync android
```

### 4. Open in Android Studio
```bash
npx cap open android
```

### 5. Build APK in Android Studio
1. Wait for Gradle sync to complete (may take a few minutes on first run)
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. The APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

## Installing on Your Phone

### Option A: Direct USB Install (Recommended)
1. On your Android phone, go to **Settings > About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go to **Settings > Developer Options** and enable **USB Debugging**
4. Connect your phone to your computer via USB
5. In Android Studio, select your phone from the device dropdown at the top
6. Click the green **Run** button (play icon) to install and run directly

### Option B: Transfer APK File
1. Build the APK using the steps above
2. Transfer `android/app/build/outputs/apk/debug/app-debug.apk` to your phone
   - Via email, Google Drive, USB cable, or any file transfer method
3. On your phone, open the APK file
4. If prompted, go to **Settings > Install Unknown Apps** and allow the source
5. Tap **Install**

### Option C: Use ADB Command Line
```bash
# With phone connected via USB and USB debugging enabled:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Development

### Run in browser for testing
```bash
npm run dev
```

### Full Android rebuild
```bash
npm run android
```

### Open Android Studio
```bash
npm run android:open
```
