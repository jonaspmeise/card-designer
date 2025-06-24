const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const HtmlIncludePlugin = require('./html-include-plugin.cjs');

module.exports = {
  devtool: 'inline-source-map',
  entry: './ts-temp/client/script.js',
  mode: 'development',
  devtool: false,
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        sourceMap: false
      }
    })]
  },
  output: {
    filename: './bundle.js',
    path: path.resolve(__dirname, './dist')
  },
  resolve: {
    extensions: ['.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/client/index.html"
    }),
    new HtmlIncludePlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: './src/client/css/*.css', to: './[name][ext]' },
        { from: './src/client/icon/*.ico', to: './[name][ext]' }
      ]
    }),
  ]
};