const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  '@react-native/assets-registry': path.resolve(
    __dirname,
    'node_modules/.pnpm/@react-native+assets-registry@0.74.87/node_modules/@react-native/assets-registry'
  ),
};

module.exports = withNativeWind(config, { input: './global.css' });
