const path = require("path");
const dir = "..";
const outputPath = path.join(__dirname, `${dir}/dist`);

const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
  template: "./public/index.html",
  filename: "index.html",
});

module.exports = {
  entry: {
    app: ['@babel/polyfill','./src/index.js',]
  },
  output: {
    path: outputPath,
    filename: '[name]-[chunkhash].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(css)$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [HtmlWebpackPluginConfig,],
  watch: false,

  optimization: {
    splitChunks: {
      chunks: "all",
      maxSize: 1000000,
      minSize: 0,
      name: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
        },
      },
    },
  },
};