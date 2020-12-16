const path = require('path')
const MinifyPlugin = require('babel-minify-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')

module.exports = {
  entry: './src/geogrid.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'geogrid.min.js',
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /\.worker\.js/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
        },
      },
    }, {
      test: /\.worker\.js$/,
      use: [{
        loader: 'worker-loader',
        options: {
          filename: '[name]:[hash:8].js',
          inline: 'no-fallback',
        },
      }, {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
        },
      }],
    }, {
      test: /\.scss$/,
      use: [{
        loader: 'style-loader',
      }, {
        loader: 'css-loader',
        options: {sourceMap: true},
      }, {
        loader: 'sass-loader',
        options: {sourceMap: true},
      }],
    }],
  },
  stats: {
    colors: true,
  },
  devtool: 'source-map',
  plugins: [
    new MinifyPlugin(),
    new RemovePlugin({
      after: {
        test: [{
          folder: './dist',
          method: absPath => new RegExp(/\.worker\.js(\.map)?$/).test(absPath),
        }],
      },
    }),
  ],
}
