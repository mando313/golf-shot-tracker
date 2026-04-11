import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.golftrackerpro.app',
  appName: 'Golf Tracker Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Load from Netlify so the app always gets the latest version
    url: 'https://golftrackerpro.netlify.app/',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#16a34a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#16a34a',
    },
  },
  android: {
    backgroundColor: '#f8fafc',
  },
};

export default config;
