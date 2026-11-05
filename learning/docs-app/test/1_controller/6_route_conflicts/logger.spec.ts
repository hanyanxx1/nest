import { Logger } from '../../../@nest/common/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const logCases = [
  { level: 'log', channel: 'log' },
  { level: 'warn', channel: 'warn' },
  { level: 'error', channel: 'error' },
] as const;

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(logCases)('writes $level messages with the logger context', ({ level, channel }) => {
    const output = vi.spyOn(console, channel).mockImplementation(() => undefined);
    const logger = new Logger('RouteConflictDetector');

    // 每个日志级别都应走对应输出通道，并带上来源上下文。
    logger[level]('duplicate route found');

    expect(output).toHaveBeenCalledWith('[RouteConflictDetector] duplicate route found');
  });
});
