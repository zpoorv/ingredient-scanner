// Expo's Metro config path can use Array.prototype.toReversed, which is not
// available on older Node 18 builds. Add a tiny compatibility shim so the
// dev server can still boot on this machine.
if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    configurable: true,
    value: function toReversed() {
      return [...this].reverse();
    },
    writable: true,
  });
}

const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
