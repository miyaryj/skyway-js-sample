"use strict";

const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/main.js",
  output: {
    path: `${__dirname}/dist`,
    filename: "main.js"
  },
  plugins: [new CopyWebpackPlugin({
    patterns: [
      { from: "./static/", to: `${__dirname}/dist` }
    ]
  })],
  devServer: {
    port: 8008,
    static: "dist",
    open: true
  }
};