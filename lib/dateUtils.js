/**
 * Date helpers shared by custom.html, index.html and the tests.
 *
 * Dates are stored as strings "YEAR-MM-DD" where YEAR is a historical year:
 *   1985  -> 1985 AD
 *   -27   -> 27 BC
 *   there is no year 0 (1 BC is followed directly by 1 AD)
 *
 * JavaScript Date uses astronomical numbering instead (0 = 1 BC, -1 = 2 BC, -26 = 27 BC).
 * toAstronomicalYear() / toHistoricalYear() convert between the two and have to be used
 * every time a stored year goes into a Date or comes back from it.
 *
 * Usage (browser, as ES module):
 *   import { formatDateForDisplay, calculateDuration, toAstronomicalYear, toHistoricalYear } from "./lib/dateUtils.js";
 *
 *   formatDateForDisplay("-27-01-16")            // "16 January 27 BC"
 *   calculateDuration("-27-01-01", "476-01-01")  // "502 years"
 */

/**
 * Stored (historical) year -> year understood by Date
 * @param {number} year - e.g. -27 for 27 BC
 * @returns {number} e.g. -26
 */
export function toAstronomicalYear(year) {
  return year < 0 ? year + 1 : year;
}

/**
 * Year returned by Date -> stored (historical) year
 * @param {number} year - e.g. -26
 * @returns {number} e.g. -27 for 27 BC
 */
export function toHistoricalYear(year) {
  return year <= 0 ? year - 1 : year;
}

/**
 * Format date from YYYY-MM-DD to "15 November 1985" format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string (e.g., "15 November 1985", or "15 January 100 BC" for year -100)
 */
export function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Use regex to handle negative years (BCE dates)
  const match = dateStr.match(/^(-?\d+)-(\d+)-(\d+)$/);
  if (!match) return dateStr;
  
  const yearNumber = parseInt(match[1], 10);
  const year = yearNumber < 0 ? `${-yearNumber} BC` : String(yearNumber);
  const monthIndex = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  
  const monthName = months[monthIndex] || '';
  return `${day} ${monthName} ${year}`;
}

/**
 * Calculate the duration between two dates in a human-readable format
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format (optional)
 * @returns {string} Human-readable duration string (e.g., "2 years 3 months 15 days")
 */
export function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) {
    return '';
  }

  // Parse dates using regex to handle negative years
  const parseDate = (dateStr) => {
    const match = dateStr.match(/^(-?\d+)-(\d+)-(\d+)$/);
    if (!match) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    return {
      // astronomical year, so subtraction works across the BC/AD boundary (there is no year 0)
      year: toAstronomicalYear(parseInt(match[1], 10)),
      month: parseInt(match[2], 10),
      day: parseInt(match[3], 10)
    };
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Calculate differences
  let years = end.year - start.year;
  let months = end.month - start.month;
  let days = end.day - start.day;

  // Adjust for negative days
  if (days < 0) {
    months--;
    // Get days in the previous month
    const prevMonth = end.month === 1 ? 12 : end.month - 1;
    const prevYear = end.month === 1 ? end.year - 1 : end.year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    days += daysInPrevMonth;
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  // Build the duration string
  const parts = [];
  
  if (years > 0) {
    parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  }
  
  if (months > 0) {
    parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  }
  
  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  }

  // If all are zero, it's the same day
  if (parts.length === 0) {
    return '1 day';
  }

  return parts.join(' ');
}

/**
 * Get the number of days in a given month
 * @param {number} year - The astronomical year (0 = 1 BC)
 * @param {number} month - The month (1-12)
 * @returns {number} Number of days in the month
 */
function getDaysInMonth(year, month) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Check for leap year
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  
  if (month === 2 && isLeap) {
    return 29;
  }
  
  return daysInMonth[month - 1];
}
