module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest-setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|react-native-css-interop|nativewind|moti|@shopify/flash-list)/'
  ],
};
