module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true
      }]
    ],
  };
};