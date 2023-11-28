const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const ROOT = __dirname;

module.exports = {
  mode: "production",
  entry: path.resolve(ROOT, "src", "index.ts"),
  name: "sdp-parser",
  output: {
    path: path.resolve(ROOT, "dist"),
    filename: "index.js",
    library: {
      type: "umd",
      name: "sdp-parser",
    },
    globalObject: "this",
  },
  resolve: {
    extensions: [".js", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          presets: [
            ["@babel/preset-typescript", { onlyRemoveTypeImports: true }],
            [
              "@babel/preset-env",
              {
                targets: {
                  chrome: 58,
                  ios: 11,
                  safari: 11,
                  firefox: 56,
                  node: 10,
                },
                shippedProposals: true,
              },
            ],
          ],
        },
      },
    ],
  },
  devtool: "source-map",
  plugins: [new CleanWebpackPlugin()],
};
