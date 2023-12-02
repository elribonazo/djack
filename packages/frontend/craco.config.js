const webpack = require('webpack');
const path = require('path')
require('dotenv').config();

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.devtool = "inline-source-map"
      webpackConfig.resolve.fallback = {
        fs: false,
        crypto: require.resolve(path.join(__dirname, "../../", "node_modules/crypto-browserify")),
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
