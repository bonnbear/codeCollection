module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  extends: [
    // 移除所有 'plugin:vue/...' 配置
  ],
  plugins: [
    // 移除 'vue'
  ],
  rules: {
    // 移除所有 'vue/' 开头的规则
  }
};