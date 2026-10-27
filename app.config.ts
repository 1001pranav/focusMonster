import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FocusMonster',
  slug: 'focus-monster',
  version: '1.0.0',
  scheme: 'focusmonster',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: 'com.focusmonster.app',
    adaptiveIcon: {
      backgroundColor: '#3B5BDB',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // Usage history is personal and only meaningful on this phone.
    allowBackup: false,
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      // Comes with the v2 mindful gate, behind its own explanation.
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-notifications',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 120, backgroundColor: '#F4F2EE', dark: { backgroundColor: '#121110' } }],
    ['expo-build-properties', { android: { minSdkVersion: 26 } }],
  ],
  experiments: { typedRoutes: false },
});
