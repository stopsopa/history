/**
 * Format date from YYYY-MM-DD to "15 November 1985" format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string (e.g., "15 November 1985")
 */
export function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Use regex to handle negative years (BCE dates)
  const match = dateStr.match(/^(-?\d+)-(\d+)-(\d+)$/);
  if (!match) return dateStr;
  
  const year = match[1];
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
      year: parseInt(match[1], 10),
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
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @returns {number} Number of days in the month
 */
function getDaysInMonth(year, month) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Check for leap year
  const absYear = Math.abs(year);
  const isLeap = (absYear % 4 === 0 && absYear % 100 !== 0) || (absYear % 400 === 0);
  
  if (month === 2 && isLeap) {
    return 29;
  }
  
  return daysInMonth[month - 1];
}
