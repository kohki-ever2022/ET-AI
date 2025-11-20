/**
 * Formatters Utility Tests
 *
 * Tests for common formatting functions
 */

import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatBytes,
  formatDate,
  formatRelativeTime,
  truncate,
  formatDuration,
} from '../../utils/formatters';

describe('formatCurrency', () => {
  it('should format currency with 2 decimal places', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('should format small currency amounts', () => {
    expect(formatCurrency(0.1234)).toBe('$0.1234');
  });

  it('should format large currency amounts', () => {
    const result = formatCurrency(1234567.89);
    expect(result).toContain('1,234,567.89');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle negative amounts', () => {
    const result = formatCurrency(-50.25);
    expect(result).toContain('-');
    expect(result).toContain('50.25');
  });
});

describe('formatNumber', () => {
  it('should format large numbers with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('should handle small numbers', () => {
    expect(formatNumber(100)).toBe('100');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should handle decimal numbers', () => {
    const result = formatNumber(1234.56);
    expect(result).toContain('1,234.56');
  });
});

describe('formatPercentage', () => {
  it('should format percentage with default 1 decimal place', () => {
    expect(formatPercentage(0.5)).toBe('50.0%');
  });

  it('should format percentage with custom decimal places', () => {
    expect(formatPercentage(0.1234, 2)).toBe('12.34%');
    expect(formatPercentage(0.1234, 0)).toBe('12%');
  });

  it('should handle 0%', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('should handle 100%', () => {
    expect(formatPercentage(1)).toBe('100.0%');
  });

  it('should handle values over 100%', () => {
    expect(formatPercentage(1.5)).toBe('150.0%');
  });
});

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(2048)).toBe('2 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should format with custom decimal places', () => {
    expect(formatBytes(1500, 1)).toBe('1.5 KB');
    expect(formatBytes(1500, 3)).toBe('1.465 KB');
  });

  it('should format terabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
  });
});

describe('formatDate', () => {
  it('should format Date object', () => {
    const date = new Date('2025-01-15T10:30:00');
    const formatted = formatDate(date);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should format timestamp number', () => {
    const timestamp = new Date('2025-01-15T10:30:00').getTime();
    const formatted = formatDate(timestamp);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should format date string', () => {
    const formatted = formatDate('2025-01-15T10:30:00');
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should accept custom options', () => {
    const date = new Date('2025-01-15T10:30:00');
    const formatted = formatDate(date, { year: 'numeric', month: 'long' });
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });
});

describe('formatRelativeTime', () => {
  beforeAll(() => {
    // Mock current time to 2025-01-15 12:00:00
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should format "just now" for recent times', () => {
    const recent = new Date('2025-01-15T11:59:50'); // 10 seconds ago
    expect(formatRelativeTime(recent)).toBe('たった今');
  });

  it('should format minutes ago', () => {
    const mins = new Date('2025-01-15T11:30:00'); // 30 minutes ago
    expect(formatRelativeTime(mins)).toBe('30分前');
  });

  it('should format hours ago', () => {
    const hours = new Date('2025-01-15T10:00:00'); // 2 hours ago
    expect(formatRelativeTime(hours)).toBe('2時間前');
  });

  it('should format days ago', () => {
    const days = new Date('2025-01-12T12:00:00'); // 3 days ago
    expect(formatRelativeTime(days)).toBe('3日前');
  });

  it('should format older dates with full date', () => {
    const old = new Date('2025-01-01T12:00:00'); // 2 weeks ago
    const formatted = formatRelativeTime(old);
    expect(formatted).toBeTruthy();
    // Should not be a relative format like "X日前"
    expect(formatted).not.toContain('日前');
  });

  it('should handle timestamp number', () => {
    const timestamp = new Date('2025-01-15T11:30:00').getTime();
    expect(formatRelativeTime(timestamp)).toBe('30分前');
  });

  it('should handle date string', () => {
    expect(formatRelativeTime('2025-01-15T11:30:00')).toBe('30分前');
  });
});

describe('truncate', () => {
  it('should not truncate short strings', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('should truncate long strings', () => {
    expect(truncate('This is a very long string', 10)).toBe('This is...');
  });

  it('should handle exact length', () => {
    expect(truncate('Exactly', 7)).toBe('Exactly');
  });

  it('should truncate to minimum 3 characters (for ellipsis)', () => {
    expect(truncate('Hello', 3)).toBe('...');
  });

  it('should handle empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});

describe('formatDuration', () => {
  it('should format milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('should format seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(5500)).toBe('5.5s');
    expect(formatDuration(59000)).toBe('59.0s');
  });

  it('should format minutes', () => {
    expect(formatDuration(60000)).toBe('1.0分');
    expect(formatDuration(90000)).toBe('1.5分');
    expect(formatDuration(3599000)).toBe('60.0分');
  });

  it('should format hours', () => {
    expect(formatDuration(3600000)).toBe('1.0時間');
    expect(formatDuration(7200000)).toBe('2.0時間');
    expect(formatDuration(5400000)).toBe('1.5時間');
  });

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0ms');
  });
});
