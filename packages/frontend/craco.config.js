const webpack = require('webpack');
require('dotenv').config();

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        fs: false,
        crypto: false,
        stream: require.resolve("stream-browserify"),
        path: require.resolve("path-browserify"),
      };
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NEXT_PUBLIC_DIDWEB_HOST': JSON.stringify(process.env.NEXT_PUBLIC_DIDWEB_HOST),
          'process.env.NEXT_PUBLIC_DIDWEB_HOSTNAME': JSON.stringify(process.env.NEXT_PUBLIC_DIDWEB_HOSTNAME),
          'process.env.NEXT_PUBLIC_DOMAIN': JSON.stringify(process.env.NEXT_PUBLIC_DOMAIN),
        }))
      return webpackConfig;
    },
  },
};
