/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const webpack = require("webpack");

module.exports = withBundleAnalyzer({
  output: "export",
  poweredByHeader: false,
  trailingSlash: true,
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // config.module.rules.push(
    //   {
    //     test: /\.worker\.ts$/,
    //     loader: "worker-loader",
    //     options: {
    //       filename: "static/[hash].worker.js",
    //       publicPath: "/_next/",
    //     },
    //   }
    //   // {
    //   //   test: /\.wasm$/,
    //   //   type: "javascript/auto",
    //   //   loader: "file-loader",
    //   // }
    // );

    config.optimization.moduleIds = "named";
    // config.module.rules.push({
    //   test: /\.wasm$/,
    //   type: "webassembly/async",
    // });

    const webpackConfig = {
      ...config,
      plugins: [
        ...config.plugins,
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        }),
        new webpack.NormalModuleReplacementPlugin(
          /^stream$/,
          require.resolve("stream-browserify")
        ),
      ],
      experiments: {
        ...(config.experiments || {}),
        syncWebAssembly: true,
        topLevelAwait: true,
        asyncWebAssembly: true,
        layers: true,
      },
    };

    return webpackConfig;
  },
});
