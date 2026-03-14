/**
 * 性能监控工具
 */

// 性能指标
const performanceMetrics = {
  messageRenderCount: 0,
  iconUpdateCount: 0,
  apiRequestCount: 0,
  longPollCount: 0,
  mentionCalculationCount: 0,
  lastApiRequestTime: 0,
  averageApiRequestTime: 0,
  cacheHitCount: 0,
  cacheMissCount: 0
};

// 性能监控配置
const config = {
  enabled: process.env.NODE_ENV === 'development',
  logThreshold: 200, // 提高阈值，超过 200ms 才记录
  maxMetricsHistory: 50, // 减少历史记录数量
  sampleRate: 0.1 // 只采样 10% 的指标，减少开销
};

// 性能历史记录
const metricsHistory = [];

/**
 * 记录性能指标
 */
export const recordMetric = (metricName, value = 1) => {
  if (!config.enabled) return;

  // 只采样部分指标，减少开销
  if (Math.random() > config.sampleRate) return;

  if (performanceMetrics.hasOwnProperty(metricName)) {
    if (typeof value === 'number') {
      performanceMetrics[metricName] += value;
    } else {
      performanceMetrics[metricName]++;
    }
  }
};

/**
 * 记录 API 请求时间
 */
export const recordApiRequest = (startTime) => {
  if (!config.enabled) return;

  const duration = Date.now() - startTime;
  recordMetric('apiRequestCount');

  // 更新平均时间
  const count = performanceMetrics.apiRequestCount;
  const totalTime = performanceMetrics.averageApiRequestTime * (count - 1) + duration;
  performanceMetrics.averageApiRequestTime = totalTime / count;

  performanceMetrics.lastApiRequestTime = duration;

  // 如果请求时间超过阈值，记录到历史
  if (duration > config.logThreshold) {
    metricsHistory.push({
      type: 'slow-api',
      duration,
      timestamp: Date.now()
    });

    // 限制历史记录数量
    if (metricsHistory.length > config.maxMetricsHistory) {
      metricsHistory.shift();
    }
  }

  return duration;
};

/**
 * 记录缓存命中/未命中
 */
export const recordCacheHit = () => {
  if (!config.enabled) return;
  recordMetric('cacheHitCount');
};

export const recordCacheMiss = () => {
  if (!config.enabled) return;
  recordMetric('cacheMissCount');
};

/**
 * 获取性能指标
 */
export const getPerformanceMetrics = () => {
  if (!config.enabled) return {};

  return {
    ...performanceMetrics,
    cacheHitRate: performanceMetrics.cacheHitCount /
      (performanceMetrics.cacheHitCount + performanceMetrics.cacheMissCount || 1),
    totalRequests: performanceMetrics.apiRequestCount + performanceMetrics.longPollCount
  };
};

/**
 * 打印性能报告
 */
export const printPerformanceReport = () => {
  if (!config.enabled) return;

  const metrics = getPerformanceMetrics();
  const cacheRate = (metrics.cacheHitRate * 100).toFixed(2) + '%';

  console.group('📊 性能监控报告');
  console.log('📨 消息渲染次数:', metrics.messageRenderCount);
  console.log('🎨 图标更新次数:', metrics.iconUpdateCount);
  console.log('🌐 API 请求次数:', metrics.apiRequestCount);
  console.log('🔄 长轮询次数:', metrics.longPollCount);
  console.log('📝 @提及计算次数:', metrics.mentionCalculationCount);
  console.log('⏱️ 最后 API 请求时间:', metrics.lastApiRequestTime + 'ms');
  console.log('📈 平均 API 请求时间:', metrics.averageApiRequestTime.toFixed(2) + 'ms');
  console.log('💾 缓存命中率:', cacheRate);
  console.log('💾 缓存命中次数:', metrics.cacheHitCount);
  console.log('💾 缓存未命中次数:', metrics.cacheMissCount);
  console.log('📊 总请求数:', metrics.totalRequests);

  if (metricsHistory.length > 0) {
    console.log('⚠️ 慢请求记录:');
    metricsHistory.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.duration}ms (${new Date(record.timestamp).toLocaleTimeString()})`);
    });
  }

  console.groupEnd();
};

/**
 * 重置性能指标
 */
export const resetPerformanceMetrics = () => {
  Object.keys(performanceMetrics).forEach(key => {
    if (typeof performanceMetrics[key] === 'number') {
      performanceMetrics[key] = 0;
    }
  });
  metricsHistory.length = 0;
};

/**
 * 性能监控装饰器
 */
export const withPerformanceMonitor = (fn, metricName) => {
  return (...args) => {
    if (!config.enabled) {
      return fn(...args);
    }

    const startTime = Date.now();
    recordMetric(metricName);

    try {
      const result = fn(...args);

      // 如果返回 Promise
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const duration = Date.now() - startTime;
          if (duration > config.logThreshold) {
            console.warn(`[性能警告] ${metricName} 耗时 ${duration}ms`);
          }
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (duration > config.logThreshold) {
        console.warn(`[性能警告] ${metricName} 耗时 ${duration}ms (出错)`);
      }
      throw error;
    }
  };
};

/**
 * 定时打印性能报告
 */
let performanceReportInterval = null;

export const startPerformanceMonitoring = (interval = 30000) => {
  if (!config.enabled || performanceReportInterval) return;

  performanceReportInterval = setInterval(() => {
    printPerformanceReport();
  }, interval);

  console.log(`✅ 性能监控已启动 (每 ${interval}ms 打印一次报告)`);
};

export const stopPerformanceMonitoring = () => {
  if (performanceReportInterval) {
    clearInterval(performanceReportInterval);
    performanceReportInterval = null;
    console.log('⏸️ 性能监控已停止');
  }
};

/**
 * 暴露到 window 对象，方便调试
 */
if (config.enabled && typeof window !== 'undefined') {
  window.__perf = {
    metrics: performanceMetrics,
    getMetrics: getPerformanceMetrics,
    printReport: printPerformanceReport,
    reset: resetPerformanceMetrics,
    startMonitoring: startPerformanceMonitoring,
    stopMonitoring: stopPerformanceMonitoring
  };

  console.log('🔧 性能监控工具已加载。使用 window.__perf 访问。');
  console.log('   - window.__perf.getMetrics() - 获取指标');
  console.log('   - window.__perf.printReport() - 打印报告');
  console.log('   - window.__perf.reset() - 重置指标');
  console.log('   - window.__perf.startMonitoring(30000) - 启动监控');
  console.log('   - window.__perf.stopMonitoring() - 停止监控');
}