import { describe, test, expect } from 'vitest';
import { calculateDuration, formatDateForDisplay } from '../lib/dateUtils.js';

describe('formatDateForDisplay', () => {
  test('should return empty string for empty input', () => {
    expect(formatDateForDisplay('')).toBe('');
    expect(formatDateForDisplay(null)).toBe('');
    expect(formatDateForDisplay(undefined)).toBe('');
  });

  test('should format standard dates correctly', () => {
    expect(formatDateForDisplay('1985-11-15')).toBe('15 November 1985');
    expect(formatDateForDisplay('1986-03-12')).toBe('12 March 1986');
    expect(formatDateForDisplay('2024-01-01')).toBe('1 January 2024');
    expect(formatDateForDisplay('2024-12-31')).toBe('31 December 2024');
  });

  test('should handle all months correctly', () => {
    expect(formatDateForDisplay('2024-01-15')).toBe('15 January 2024');
    expect(formatDateForDisplay('2024-02-15')).toBe('15 February 2024');
    expect(formatDateForDisplay('2024-03-15')).toBe('15 March 2024');
    expect(formatDateForDisplay('2024-04-15')).toBe('15 April 2024');
    expect(formatDateForDisplay('2024-05-15')).toBe('15 May 2024');
    expect(formatDateForDisplay('2024-06-15')).toBe('15 June 2024');
    expect(formatDateForDisplay('2024-07-15')).toBe('15 July 2024');
    expect(formatDateForDisplay('2024-08-15')).toBe('15 August 2024');
    expect(formatDateForDisplay('2024-09-15')).toBe('15 September 2024');
    expect(formatDateForDisplay('2024-10-15')).toBe('15 October 2024');
    expect(formatDateForDisplay('2024-11-15')).toBe('15 November 2024');
    expect(formatDateForDisplay('2024-12-15')).toBe('15 December 2024');
  });

  test('should handle single digit days correctly', () => {
    expect(formatDateForDisplay('2024-01-01')).toBe('1 January 2024');
    expect(formatDateForDisplay('2024-01-05')).toBe('5 January 2024');
    expect(formatDateForDisplay('2024-01-09')).toBe('9 January 2024');
  });

  test('should handle BCE dates (negative years)', () => {
    expect(formatDateForDisplay('-100-01-15')).toBe('15 January -100');
    expect(formatDateForDisplay('-0500-06-20')).toBe('20 June -0500');
  });

  test('should handle padded month and day values', () => {
    expect(formatDateForDisplay('2024-01-05')).toBe('5 January 2024');
    expect(formatDateForDisplay('2024-09-08')).toBe('8 September 2024');
  });

  test('should return original string for invalid format', () => {
    expect(formatDateForDisplay('2024-01')).toBe('2024-01');
    expect(formatDateForDisplay('2024')).toBe('2024');
    expect(formatDateForDisplay('invalid')).toBe('invalid');
  });

  test('should handle edge case dates', () => {
    expect(formatDateForDisplay('2020-02-29')).toBe('29 February 2020'); // Leap year
    expect(formatDateForDisplay('1900-01-01')).toBe('1 January 1900');
    expect(formatDateForDisplay('2100-12-31')).toBe('31 December 2100');
  });
});

describe('calculateDuration', () => {
  test('should return empty string when start date is missing', () => {
    expect(calculateDuration('', '2024-12-31')).toBe('');
    expect(calculateDuration(null, '2024-12-31')).toBe('');
  });

  test('should return empty string when end date is missing', () => {
    expect(calculateDuration('2024-01-01', '')).toBe('');
    expect(calculateDuration('2024-01-01', null)).toBe('');
  });

  test('should calculate duration for same day', () => {
    expect(calculateDuration('2024-01-15', '2024-01-15')).toBe('1 day');
  });

  test('should calculate duration in days only', () => {
    expect(calculateDuration('2024-01-01', '2024-01-10')).toBe('9 days');
    expect(calculateDuration('2024-01-01', '2024-01-02')).toBe('1 day');
    expect(calculateDuration('2024-01-15', '2024-01-20')).toBe('5 days');
  });

  test('should calculate duration in months and days', () => {
    expect(calculateDuration('2024-01-01', '2024-02-01')).toBe('1 month');
    expect(calculateDuration('2024-01-01', '2024-02-15')).toBe('1 month 14 days');
    expect(calculateDuration('2024-01-15', '2024-03-20')).toBe('2 months 5 days');
  });

  test('should calculate duration in years, months, and days', () => {
    expect(calculateDuration('2020-01-01', '2021-01-01')).toBe('1 year');
    expect(calculateDuration('2020-01-01', '2022-01-01')).toBe('2 years');
    expect(calculateDuration('2020-01-01', '2021-06-15')).toBe('1 year 5 months 14 days');
    expect(calculateDuration('1985-11-15', '1986-03-12')).toBe('3 months 25 days');
  });

  test('should handle leap years correctly', () => {
    // 2020 is a leap year (Feb has 29 days)
    expect(calculateDuration('2020-02-01', '2020-03-01')).toBe('1 month');
    // 2021 is not a leap year (Feb has 28 days)
    expect(calculateDuration('2021-02-01', '2021-03-01')).toBe('1 month');
    // Crossing leap year February - Jan 31 + 1 month = Feb 29 (leap year), then to Mar 1 is 1 day
    expect(calculateDuration('2020-01-31', '2020-03-01')).toBe('1 month');
  });

  test('should handle month boundaries correctly', () => {
    // January (31 days) to February
    expect(calculateDuration('2024-01-31', '2024-02-29')).toBe('29 days');
    // February to March
    expect(calculateDuration('2024-02-15', '2024-03-15')).toBe('1 month');
    // Different day counts - Jan 31 to Mar 1 is exactly 1 month
    expect(calculateDuration('2024-01-31', '2024-03-01')).toBe('1 month');
  });

  test('should handle year boundaries correctly', () => {
    expect(calculateDuration('2023-12-31', '2024-01-01')).toBe('1 day');
    expect(calculateDuration('2023-12-15', '2024-01-15')).toBe('1 month');
    expect(calculateDuration('2023-06-15', '2024-06-15')).toBe('1 year');
  });

  test('should handle complex durations', () => {
    expect(calculateDuration('1985-11-15', '1986-03-12')).toBe('3 months 25 days');
    expect(calculateDuration('2000-01-01', '2005-12-31')).toBe('5 years 11 months 30 days');
    expect(calculateDuration('2020-02-29', '2021-02-28')).toBe('11 months 30 days');
  });

  test('should handle BCE dates (negative years)', () => {
    expect(calculateDuration('-100-01-01', '-99-01-01')).toBe('1 year');
    expect(calculateDuration('-100-06-15', '-100-12-31')).toBe('6 months 16 days');
  });

  test('should use singular form for 1 year/month/day', () => {
    expect(calculateDuration('2024-01-01', '2025-01-01')).toBe('1 year');
    expect(calculateDuration('2024-01-01', '2024-02-01')).toBe('1 month');
    expect(calculateDuration('2024-01-01', '2024-01-02')).toBe('1 day');
    expect(calculateDuration('2024-01-01', '2025-02-02')).toBe('1 year 1 month 1 day');
  });

  test('should use plural form for multiple years/months/days', () => {
    expect(calculateDuration('2024-01-01', '2026-01-01')).toBe('2 years');
    expect(calculateDuration('2024-01-01', '2024-03-01')).toBe('2 months');
    expect(calculateDuration('2024-01-01', '2024-01-05')).toBe('4 days');
    expect(calculateDuration('2024-01-01', '2026-03-05')).toBe('2 years 2 months 4 days');
  });

  test('should handle end of month edge cases', () => {
    // From Jan 31 to Feb 28 (non-leap year)
    expect(calculateDuration('2023-01-31', '2023-02-28')).toBe('28 days');
    // From Jan 31 to Mar 31
    expect(calculateDuration('2024-01-31', '2024-03-31')).toBe('2 months');
    // From Jan 30 to Feb 28
    expect(calculateDuration('2024-01-30', '2024-02-28')).toBe('29 days');
  });

  test('should throw error for invalid date format', () => {
    expect(() => calculateDuration('invalid', '2024-01-01')).toThrow('Invalid date format');
    expect(() => calculateDuration('2024-01-01', 'invalid')).toThrow('Invalid date format');
    expect(() => calculateDuration('2024-01', '2024-01-01')).toThrow('Invalid date format');
  });
});
