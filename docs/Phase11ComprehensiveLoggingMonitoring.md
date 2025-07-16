// services/paradigmLoggingService.ts
import { HostParadigm, ParadigmProbabilities, ContextLayer, ModelType, EffortType } from '../types';

interface LogEntry {
id: string;
timestamp: number;
level: 'debug' | 'info' | 'warn' | 'error';
category: LogCategory;
paradigm?: HostParadigm;
message: string;
data?: any;
duration?: number;
stackTrace?: string;
}

type LogCategory =
| 'classification'
| 'context_layer'
| 'research_execution'
| 'self_healing'
| 'collaboration'
| 'learning'
| 'cache'
| 'performance'
| 'error';

interface PerformanceMetrics {
operation: string;
paradigm?: HostParadigm;
startTime: number;
endTime?: number;
duration?: number;
success: boolean;
metadata?: any;
}

interface ParadigmMetrics {
paradigm: HostParadigm;
totalRequests: number;
successfulRequests: number;
averageConfidence: number;
averageDuration: number;
contextLayerMetrics: Record<ContextLayer, {
executions: number;
averageDuration: number;
errors: number;
}>;
collaborationMetrics: {
initiated: number;
received: number;
successful: number;
};
errorRate: number;
lastUsed: number;
}

export class ParadigmLoggingService {
private static instance: ParadigmLoggingService;
private logs: LogEntry[] = [];
private performanceTracker: Map<string, PerformanceMetrics> = new Map();
private paradigmMetrics: Map<HostParadigm, ParadigmMetrics> = new Map();

private readonly MAX_LOGS = 10000;
private readonly LOG_RETENTION_HOURS = 24;
private logListeners: Array<(entry: LogEntry) => void> = [];

private constructor() {
this.initializeMetrics();
this.startCleanupInterval();
}

public static getInstance(): ParadigmLoggingService {
if (!ParadigmLoggingService.instance) {
ParadigmLoggingService.instance = new ParadigmLoggingService();
}
return ParadigmLoggingService.instance;
}

/\*\*

- Log paradigm classification
  \*/
  logClassification(
  query: string,
  probabilities: ParadigmProbabilities,
  selectedParadigm: HostParadigm | null,
  duration: number
  ): void {
  this.log('info', 'classification', `Classified query: "${query.substring(0, 50)}..."`, {
  probabilities,
  selectedParadigm,
  duration,
  threshold: 0.4
  }, selectedParadigm || undefined);
  }

/\*\*

- Log context layer execution
  \*/
  logContextLayer(
  layer: ContextLayer,
  paradigm: HostParadigm,
  action: 'start' | 'complete' | 'error',
  data?: any
  ): void {
  const message = `Context layer ${layer} ${action} for ${paradigm}`;
  this.log(
  action === 'error' ? 'error' : 'info',
  'context_layer',
  message,
  { layer, action, ...data },
  paradigm
  );


    // Update metrics
    if (paradigm) {
      const metrics = this.getOrCreateMetrics(paradigm);
      if (!metrics.contextLayerMetrics[layer]) {
        metrics.contextLayerMetrics[layer] = {
          executions: 0,
          averageDuration: 0,
          errors: 0
        };
      }

      if (action === 'complete') {
        metrics.contextLayerMetrics[layer].executions++;
      } else if (action === 'error') {
        metrics.contextLayerMetrics[layer].errors++;
      }
    }

}

/\*\*

- Log research execution
  \*/
  logResearch(
  paradigm: HostParadigm,
  phase: 'start' | 'search' | 'synthesis' | 'complete',
  data: {
  query?: string;
  sources?: number;
  confidence?: number;
  duration?: number;
  model?: ModelType;
  effort?: EffortType;
  }
  ): void {
  this.log('info', 'research_execution', `Research ${phase} for ${paradigm}`, data, paradigm);


    if (phase === 'complete') {
      const metrics = this.getOrCreateMetrics(paradigm);
      metrics.totalRequests++;
      if (data.confidence && data.confidence > 0.4) {
        metrics.successfulRequests++;
      }
      if (data.confidence) {
        metrics.averageConfidence =
          (metrics.averageConfidence * (metrics.totalRequests - 1) + data.confidence) /
          metrics.totalRequests;
      }
      if (data.duration) {
        metrics.averageDuration =
          (metrics.averageDuration * (metrics.totalRequests - 1) + data.duration) /
          metrics.totalRequests;
      }
      metrics.lastUsed = Date.now();
    }

}

/\*\*

- Log self-healing attempts
  \*/
  logSelfHealing(
  paradigm: HostParadigm,
  strategy: string,
  originalConfidence: number,
  healedConfidence: number,
  success: boolean
  ): void {
  this.log(
  success ? 'info' : 'warn',
  'self_healing',
  `Self-healing ${success ? 'successful' : 'failed'} for ${paradigm}`,
  {
  strategy,
  originalConfidence,
  healedConfidence,
  improvement: healedConfidence - originalConfidence,
  success
  },
  paradigm
  );
  }

/\*\*

- Log collaboration events
  \*/
  logCollaboration(
  fromHost: HostParadigm,
  toHost: HostParadigm,
  reason: string,
  phase: 'request' | 'processing' | 'complete' | 'failed',
  data?: any
  ): void {
  this.log(
  phase === 'failed' ? 'error' : 'info',
  'collaboration',
  `Collaboration ${fromHost}→${toHost}: ${phase}`,
  { reason, phase, ...data },
  fromHost
  );


    // Update metrics
    if (phase === 'request') {
      this.getOrCreateMetrics(fromHost).collaborationMetrics.initiated++;
      this.getOrCreateMetrics(toHost).collaborationMetrics.received++;
    } else if (phase === 'complete') {
      this.getOrCreateMetrics(fromHost).collaborationMetrics.successful++;
      this.getOrCreateMetrics(toHost).collaborationMetrics.successful++;
    }

}

/\*\*

- Log learning events
  \*/
  logLearning(
  paradigm: HostParadigm,
  event: 'pattern_detected' | 'weight_adjusted' | 'feedback_received',
  data: any
  ): void {
  this.log('info', 'learning', `Learning event: ${event} for ${paradigm}`, data, paradigm);
  }

/\*\*

- Log cache operations
  \*/
  logCache(
  operation: 'hit' | 'miss' | 'set' | 'evict',
  paradigm?: HostParadigm,
  key?: string
  ): void {
  this.log('debug', 'cache', `Cache ${operation}`, { key }, paradigm);
  }

/\*\*

- Start performance tracking
  \*/
  startPerformanceTracking(
  operation: string,
  paradigm?: HostParadigm,
  metadata?: any
  ): string {
  const id = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  this.performanceTracker.set(id, {
  operation,
  paradigm,
  startTime: Date.now(),
  success: false,
  metadata
  });
  return id;
  }

/\*\*

- End performance tracking
  \*/
  endPerformanceTracking(id: string, success: boolean = true): void {
  const metrics = this.performanceTracker.get(id);
  if (!metrics) return;


    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.success = success;

    this.log(
      'info',
      'performance',
      `Operation "${metrics.operation}" completed in ${metrics.duration}ms`,
      metrics,
      metrics.paradigm
    );

    this.performanceTracker.delete(id);

}

/\*\*

- Get paradigm metrics
  \*/
  getParadigmMetrics(paradigm?: HostParadigm): ParadigmMetrics | Map<HostParadigm, ParadigmMetrics> {
  if (paradigm) {
  return this.getOrCreateMetrics(paradigm);
  }
  return this.paradigmMetrics;
  }

/\*\*

- Get recent logs
  \*/
  getRecentLogs(
  options: {
  paradigm?: HostParadigm;
  category?: LogCategory;
  level?: LogEntry['level'];
  limit?: number;
  since?: number;
  } = {}
  ): LogEntry[] {
  let logs = [...this.logs];


    if (options.paradigm) {
      logs = logs.filter(log => log.paradigm === options.paradigm);
    }
    if (options.category) {
      logs = logs.filter(log => log.category === options.category);
    }
    if (options.level) {
      logs = logs.filter(log => this.getLogLevelValue(log.level) >= this.getLogLevelValue(options.level!));
    }
    if (options.since) {
      logs = logs.filter(log => log.timestamp > options.since);
    }

    return logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, options.limit || 100);

}

/\*\*

- Export logs for analysis
  \*/
  exportLogs(format: 'json' | 'csv' = 'json'): string {
  if (format === 'json') {
  return JSON.stringify({
  logs: this.logs,
  metrics: Object.fromEntries(this.paradigmMetrics),
  exported: new Date().toISOString()
  }, null, 2);
  }


    // CSV format
    const headers = ['timestamp', 'level', 'category', 'paradigm', 'message', 'duration'];
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.category,
      log.paradigm || '',
      log.message,
      log.duration || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');

}

/\*\*

- Add log listener for real-time monitoring
  \*/
  addLogListener(listener: (entry: LogEntry) => void): () => void {
  this.logListeners.push(listener);


    // Return unsubscribe function
    return () => {
      const index = this.logListeners.indexOf(listener);
      if (index > -1) {
        this.logListeners.splice(index, 1);
      }
    };

}

/\*\*

- Get performance summary
  \*/
  getPerformanceSummary(): {
  paradigmPerformance: Array<{
  paradigm: HostParadigm;
  averageResponseTime: number;
  successRate: number;
  utilizationRate: number;
  }>;
  layerPerformance: Array<{
  layer: ContextLayer;
  averageExecutionTime: number;
  errorRate: number;
  }>;
  overallHealth: 'healthy' | 'warning' | 'critical';
  } {
  const paradigmPerformance = Array.from(this.paradigmMetrics.entries()).map(([paradigm, metrics]) => ({
  paradigm,
  averageResponseTime: metrics.averageDuration,
  successRate: metrics.totalRequests > 0
  ? metrics.successfulRequests / metrics.totalRequests
  : 0,
  utilizationRate: metrics.totalRequests / Math.max(...Array.from(this.paradigmMetrics.values()).map(m => m.totalRequests))
  }));


    // Aggregate layer performance across all paradigms
    const layerStats = new Map<ContextLayer, { totalDuration: number; executions: number; errors: number }>();

    for (const metrics of this.paradigmMetrics.values()) {
      for (const [layer, layerMetrics] of Object.entries(metrics.contextLayerMetrics)) {
        const stats = layerStats.get(layer as ContextLayer) || { totalDuration: 0, executions: 0, errors: 0 };
        stats.totalDuration += layerMetrics.averageDuration * layerMetrics.executions;
        stats.executions += layerMetrics.executions;
        stats.errors += layerMetrics.errors;
        layerStats.set(layer as ContextLayer, stats);
      }
    }

    const layerPerformance = Array.from(layerStats.entries()).map(([layer, stats]) => ({
      layer,
      averageExecutionTime: stats.executions > 0 ? stats.totalDuration / stats.executions : 0,
      errorRate: stats.executions > 0 ? stats.errors / stats.executions : 0
    }));

    // Determine overall health
    const avgSuccessRate = paradigmPerformance.reduce((sum, p) => sum + p.successRate, 0) / paradigmPerformance.length;
    const avgErrorRate = layerPerformance.reduce((sum, l) => sum + l.errorRate, 0) / layerPerformance.length;

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (avgSuccessRate < 0.7 || avgErrorRate > 0.2) {
      overallHealth = 'critical';
    } else if (avgSuccessRate < 0.85 || avgErrorRate > 0.1) {
      overallHealth = 'warning';
    }

    return {
      paradigmPerformance,
      layerPerformance,
      overallHealth
    };

}

/\*\*

- Private helper methods
  \*/
  private log(
  level: LogEntry['level'],
  category: LogCategory,
  message: string,
  data?: any,
  paradigm?: HostParadigm
  ): void {
  const entry: LogEntry = {
  id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: Date.now(),
  level,
  category,
  paradigm,
  message,
  data
  };


    // Add stack trace for errors
    if (level === 'error') {
      entry.stackTrace = new Error().stack;
    }

    this.logs.push(entry);

    // Enforce max logs limit
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Notify listeners
    this.logListeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Log listener error:', error);
      }
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${category}${paradigm ? `:${paradigm}` : ''}]`;
      console[level](prefix, message, data);
    }

}

private getOrCreateMetrics(paradigm: HostParadigm): ParadigmMetrics {
if (!this.paradigmMetrics.has(paradigm)) {
this.paradigmMetrics.set(paradigm, {
paradigm,
totalRequests: 0,
successfulRequests: 0,
averageConfidence: 0,
averageDuration: 0,
contextLayerMetrics: {} as any,
collaborationMetrics: {
initiated: 0,
received: 0,
successful: 0
},
errorRate: 0,
lastUsed: 0
});
}
return this.paradigmMetrics.get(paradigm)!;
}

private initializeMetrics(): void {
const paradigms: HostParadigm[] = ['dolores', 'teddy', 'bernard', 'maeve'];
paradigms.forEach(paradigm => this.getOrCreateMetrics(paradigm));
}

private startCleanupInterval(): void {
// Clean up old logs every hour
setInterval(() => {
const cutoffTime = Date.now() - (this.LOG_RETENTION_HOURS _ 60 _ 60 _ 1000);
this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
}, 60 _ 60 \* 1000);
}

private getLogLevelValue(level: LogEntry['level']): number {
const levels = { debug: 0, info: 1, warn: 2, error: 3 };
return levels[level];
}
}

// Export singleton instance
export const paradigmLogger = ParadigmLoggingService.getInstance();
