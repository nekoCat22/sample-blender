/* eslint-disable @typescript-eslint/no-var-requires */
const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        '@': require('path').resolve(__dirname, 'src')
      }
    }
  },
  chainWebpack: config => {
    config.module
      .rule('ts')
      .use('ts-loader')
      .tap(options => ({
        ...options,
        appendTsSuffixTo: [/\.vue$/],
        transpileOnly: true
      }))
  }
})
