import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vfm.soroban',
  appName: 'Soroban',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    scrollEnabled: false
  },
  server: {
    cleartext: true
  }
};

export default config;
