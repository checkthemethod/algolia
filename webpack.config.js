const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
// const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
  	app: './dist/scripts/app.js'
  },
  devtool: 'inline-source-map',
  devServer: {
      contentBase: './dist',
      hot: true
  },
  plugins: [
    // new CleanWebpackPlugin(['dist']),
    // new HtmlWebpackPlugin({
    //   title: 'Algolia Demo'
    // }),
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin()
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ]
  }
};