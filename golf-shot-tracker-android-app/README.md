# Golf Tracker Pro - Android App

A native Android app for tracking golf scores for 2-4 players with Skins, Match Play, Stroke Play, and handicap adjustments.

Built with React + Capacitor. **Auto-updates** from GitHub Pages whenever you push changes to the repo.

## How Auto-Update Works

The app loads its content from GitHub Pages (`https://mando313.github.io/golf-shot-tracker/`). A GitHub Actions workflow automatically builds and deploys the latest code on every push. So whenever you make changes and push to the repo, the app will show the updated version the next time you open it - no need to rebuild the APK.

**One-time setup required:** You need to enable GitHub Pages in your repo settings (see below).

## Prerequisites

- **Node.js** 18+ (https://nodejs.org)
- **Android Studio** (https://developer.android.com/studio)
  - During installation, make sure to install the Android SDK (API 34+)
  - Accept all SDK license agreements

## Enable GitHub Pages (one-time)

1. Go to your repo on GitHub: `https://github.com/mando313/golf-shot-tracker`
2. Click **Settings** (tab at the top)
3. In the left sidebar, click **Pages**
4. Under **Build and deployment > Source**, select **GitHub Actions**
5. Push any change to trigger the first deployment

## Quick Start - Build the APK

### 1. Clone and navigate
```bash
git clone https://github.com/mando313/golf-shot-tracker.git
cd golf-shot-tracker/golf-shot-tracker-android-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Web Assets
```bash
npm run build
```

### 4. Sync with Android
```bash
npx cap sync android
```

### 5. Open in Android Studio
```bash
npx cap open android
```

### 6. Build APK in Android Studio
1. Wait for Gradle sync to complete (may take a few minutes on first run)
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. The APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

## Installing on Your Phone (Option B - Transfer APK)

1. Build the APK using the steps above
2. Transfer `android/app/build/outputs/apk/debug/app-debug.apk` to your phone
   - Via email, Google Drive, USB cable, or any file transfer method
3. On your phone, open the APK file
4. If prompted, go to **Settings > Install Unknown Apps** and allow the source
5. Tap **Install**

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
