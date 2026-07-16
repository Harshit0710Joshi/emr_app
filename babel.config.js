module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@database': './src/database',
            '@services': './src/services',
            '@sync': './src/sync',
            '@network': './src/network',
            '@models': './src/types',
            '@utils': './src/utils',
            '@theme': './src/theme',
          },
        },
      ],
    ],
  };
};