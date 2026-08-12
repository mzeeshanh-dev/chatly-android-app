module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    // Must stay last — react-native-reanimated v4 delegates its worklet
    // transform to this plugin.
    'react-native-worklets/plugin',
  ],
};
