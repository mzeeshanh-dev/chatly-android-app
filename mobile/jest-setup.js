const { Platform } = require('react-native');
if (!Platform) {
  Object.defineProperty(require('react-native'), 'Platform', {
    get: () => ({ OS: 'ios', select: (x) => x.ios }),
  });
}
