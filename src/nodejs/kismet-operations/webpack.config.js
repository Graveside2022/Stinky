const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    entry: {
      // Main app bundle
      main: './public/js/kismet-operations.js',
      // Spectrum analyzer bundle (separate for performance)
      spectrum: './public/js/spectrum.js',
      // Signal visualization bundle
      signal: './public/js/signal-visualization.js',
      // Theme bundle (small, can be loaded early)
      theme: './public/js/theme-switcher.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist/public/js'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      clean: true
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor code splitting
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: 10
          },
          // Cesium chunk (large library, load on demand)
          cesium: {
            test: /[\\/]cesium[\\/]/i,
            name: 'cesium',
            priority: 20,
            chunks: 'async' // Load only when needed
          },
          // Socket.IO chunk
          socketio: {
            test: /[\\/]socket\.io[\\/]/,
            name: 'socketio',
            priority: 15
          },
          // Common utilities
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            name: 'common'
          }
        }
      },
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
              pure_funcs: ['console.log', 'console.info']
            },
            mangle: {
              safari10: true
            },
            output: {
              comments: false
            }
          },
          extractComments: false
        })
      ],
      runtimeChunk: 'single',
      moduleIds: 'deterministic'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    browsers: ['last 2 versions', 'safari >= 7']
                  },
                  modules: false
                }]
              ],
              plugins: [
                '@babel/plugin-syntax-dynamic-import'
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|gif|svg)$/,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      // Generate new HTML with hashed bundles
      new HtmlWebpackPlugin({
        template: './views/index.html',
        filename: '../../views/index.html',
        chunks: ['runtime', 'vendor', 'common', 'theme', 'main'],
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true
        } : false
      }),
      // Compress assets in production
      isProduction && new CompressionPlugin({
        filename: '[path][base].gz',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192,
        minRatio: 0.8
      }),
      // Bundle analysis (only when needed)
      process.env.ANALYZE && new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: '../../../bundle-report.html'
      })
    ].filter(Boolean),
    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'public/js'),
        '@lib': path.resolve(__dirname, 'lib'),
        '@utils': path.resolve(__dirname, 'public/js/utils')
      }
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  };
};