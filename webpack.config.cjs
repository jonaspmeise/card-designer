const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  devtool: 'inline-source-map',
  entry: './ts-temp/script.js',
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
    filename: './client/bundle.js'
  },
  resolve: {
    extensions: ['.js']
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: './src/client/css/*.css', to: './client/[name][ext]' },
        { from: './src/client/*.html', to: './client/[name][ext]' },
        { from: './src/client/icon/*.ico', to: './client/[name][ext]' }
      ]
    })
  ]
};