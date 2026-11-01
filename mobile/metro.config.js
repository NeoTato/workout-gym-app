const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Required by expo-sqlite's browser worker; native storage does not use WASM.
if (!config.resolver.assetExts.includes('wasm')) config.resolver.assetExts.push('wasm');
const previous = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = previous ? previous(middleware, server) : middleware;
  return (request, response, done) => {
    response.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return next(request, response, done);
  };
};
module.exports = config;
