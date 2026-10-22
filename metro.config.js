const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Only include icons you actually use
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'ttf');
config.resolver.assetExts.push('ttf');

// Optimize bundle
config.transformer.minifierConfig = {
  compress: {
    drop_console: true,
    drop_debugger: true,
  },
};

module.exports = config;