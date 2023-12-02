module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        fs: false,
        crypto: false,
        stream: require.resolve("stream-browserify"),
        path: require.resolve("path-browserify"),
      };
      return webpackConfig;
    },
  },
};
