/**
 * Jest設定ファイル
 * Vue 3 + TypeScriptのテスト環境を設定
 */

module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!wavesurfer.js).+\\.js$'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: [
    '**/tests/unit/**/*.spec.[jt]s?(x)',
    '**/__tests__/*.[jt]s?(x)'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts,vue}',
    '!src/main.ts',
    '!src/router/index.ts',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  setupFiles: ['<rootDir>/tests/setup.js']
} 