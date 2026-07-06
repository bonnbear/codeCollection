// vue.config.js

// 引入所有需要的模块
const { defineConfig } = require('@vue/cli-service');
const v8 = require('v8');
const webpack = require('webpack');
const os = require('os');
const AutoImport = require('unplugin-auto-import/webpack');
const Components = require('unplugin-vue-components/webpack');
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers');

// 格式化字节为MB
function formatMB(bytes) {
  return `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;
}

// 格式化百分比
function formatPercentage(used, total) {
  return `${Math.round(used / total * 10000) / 100}%`;
}

// 获取内存使用详情
function getMemoryInfo() {
  const memInfo = {
    process: process.memoryUsage(),
    v8: v8.getHeapStatistics(),
    system: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    }
  };

  return {
    // 进程内存
    process: {
      rss: formatMB(memInfo.process.rss),
      heapTotal: formatMB(memInfo.process.heapTotal),
      heapUsed: formatMB(memInfo.process.heapUsed),
      external: formatMB(memInfo.process.external),
      arrayBuffers: formatMB(memInfo.process.arrayBuffers),
      heapUsedPercentage: formatPercentage(memInfo.process.heapUsed, memInfo.process.heapTotal)
    },
    // V8堆内存
    v8: {
      heapSizeLimit: formatMB(memInfo.v8.heap_size_limit),
      totalAvailable: formatMB(memInfo.v8.total_available_size),
      totalHeapSize: formatMB(memInfo.v8.total_heap_size),
      totalPhysicalSize: formatMB(memInfo.v8.total_physical_size),
      usedHeapSize: formatMB(memInfo.v8.used_heap_size),
      heapUsedPercentage: formatPercentage(memInfo.v8.used_heap_size, memInfo.v8.heap_size_limit)
    },
    // 系统内存
    system: {
      total: formatMB(memInfo.system.total),
      free: formatMB(memInfo.system.free),
      used: formatMB(memInfo.system.used),
      usedPercentage: formatPercentage(memInfo.system.used, memInfo.system.total)
    }
  };
}


// 使用 defineConfig 包装以获得更好的类型提示
module.exports = defineConfig({
  // 来自 Element Plus 配置的建议，用于转译依赖
  transpileDependencies: true,
  // 来自您现有配置
  lintOnSave: false,

  // 开发服务器配置 (来自您现有配置)
  devServer: {
    port: 8081,
    open: true,
    host: 'localhost',
    https: false,
    compress: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  },

  // 来自您现有配置
  chainWebpack: config => {
    config.module.rules.delete('eslint');
  },

  // 合并 Webpack 配置
  configureWebpack: {
    plugins: [
      // ==================== Element Plus 按需自动引入配置 ====================
      Components({
        resolvers: [
          ElementPlusResolver(),
        ],
      }),
      AutoImport({
        resolvers: [
          ElementPlusResolver(),
        ],
        imports: ['vue', 'vue-router'],
      }),
      // ===================================================================

      // ==================== 您原来的内存报告插件配置 ====================
      new webpack.ProgressPlugin((percentage, message, ...args) => {
        if (percentage === 1) {
          const memInfo = getMemoryInfo();
          
          console.log('\n======= 构建完成 - 内存使用报告 =======');
          
          console.log('\n=== 进程内存使用情况 ===');
          console.log(`常驻集大小 (RSS): ${memInfo.process.rss}`);
          console.log(`堆内存总量: ${memInfo.process.heapTotal}`);
          console.log(`已用堆内存: ${memInfo.process.heapUsed} (使用率: ${memInfo.process.heapUsedPercentage})`);
          console.log(`外部内存: ${memInfo.process.external}`);
          console.log(`数组缓冲区: ${memInfo.process.arrayBuffers}`);
          
          console.log('\n=== V8引擎堆内存统计 ===');
          console.log(`堆内存大小限制: ${memInfo.v8.heapSizeLimit}`);
          console.log(`可用总内存: ${memInfo.v8.totalAvailable}`);
          console.log(`堆内存总量: ${memInfo.v8.totalHeapSize}`);
          console.log(`物理内存总量: ${memInfo.v8.totalPhysicalSize}`);
          console.log(`已用堆内存: ${memInfo.v8.usedHeapSize} (使用率: ${memInfo.v8.heapUsedPercentage})`);
          
          console.log('\n=== 系统内存情况 ===');
          console.log(`系统总内存: ${memInfo.system.total}`);
          console.log(`系统可用内存: ${memInfo.system.free}`);
          console.log(`系统已用内存: ${memInfo.system.used} (使用率: ${memInfo.system.usedPercentage})`);
          
          console.log('\n=== Node.js配置信息 ===');
          if (process.env.NODE_OPTIONS && process.env.NODE_OPTIONS.includes('--max-old-space-size')) {
            console.log(`NODE_OPTIONS中设置的内存限制: ${process.env.NODE_OPTIONS}`);
          } else {
            console.log('未在NODE_OPTIONS中设置显式的内存限制');
          }
          
          console.log('\n=== 环境信息 ===');
          console.log(`Node.js版本: ${process.version}`);
          console.log(`操作系统平台: ${process.platform}`);
          console.log(`系统架构: ${process.arch}`);
          console.log(`CPU核心数: ${os.cpus().length}`);
          
          console.log('\n=== 内存使用分析 ===');
          
          const heapUsedPercent = parseFloat(memInfo.process.heapUsedPercentage);
          if (heapUsedPercent > 90) {
            console.log('⚠️ 警告: 堆内存使用率过高，建议优化内存使用或增加内存限制');
          } else if (heapUsedPercent > 70) {
            console.log('⚠️ 提示: 堆内存使用率较高，请关注内存使用情况');
          } else {
            console.log('✅ 堆内存使用率正常');
          }

          const systemUsedPercent = parseFloat(memInfo.system.usedPercentage);
          if (systemUsedPercent > 90) {
            console.log('⚠️ 警告: 系统内存使用率过高，可能影响系统性能');
          } else if (systemUsedPercent > 70) {
            console.log('⚠️ 提示: 系统内存使用率较高，建议关注系统资源');
          } else {
            console.log('✅ 系统内存使用率正常');
          }
          
          console.log('\n============================================\n');
        }
      })
      // ===================================================================
    ]
  }
});