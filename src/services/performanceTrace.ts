const performanceMarks = new Map<string, number>();

type PerformanceTraceMetadata = Record<string, string | number | boolean | null | undefined>;

function logPerformanceTrace(message: string, metadata?: PerformanceTraceMetadata) {
  if (!__DEV__) {
    return;
  }

  if (metadata && Object.keys(metadata).length > 0) {
    console.info(`[Perf] ${message}`, metadata);
    return;
  }

  console.info(`[Perf] ${message}`);
}

export function markPerformanceTrace(name: string, metadata?: PerformanceTraceMetadata) {
  performanceMarks.set(name, Date.now());
  logPerformanceTrace(`mark:${name}`, metadata);
}

export function measurePerformanceTrace(
  startName: string,
  endName: string,
  metadata?: PerformanceTraceMetadata
) {
  const startedAt = performanceMarks.get(startName);
  const finishedAt = Date.now();
  performanceMarks.set(endName, finishedAt);

  if (!startedAt) {
    logPerformanceTrace(`mark:${endName}`, metadata);
    return null;
  }

  const durationMs = finishedAt - startedAt;
  logPerformanceTrace(`${startName}->${endName}`, {
    ...metadata,
    durationMs,
  });
  return durationMs;
}
