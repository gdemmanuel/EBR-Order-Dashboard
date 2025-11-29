import { Order } from '../types';

/**
 * The single, robust source of truth for parsing an order's date and time string into a JavaScript Date object.
 * It gracefully handles null, undefined, or malformed date/time strings by returning an "Invalid Date" object.
 * This prevents crashes that can occur when trying to process invalid dates.
 */
export const parseOrderDateTime = (order: Order): Date => {
  if (!order.pickupDate) {
    return new Date('invalid'); // Return an invalid date if pickupDate is missing
  }

  // Handle various date formats like MM/DD/YYYY or YYYY-MM-DD
  const dateParts = order.pickupDate.includes('-') ? order.pickupDate.split('-') : order.pickupDate.split('/');
  
  let year, month, day;

  if (dateParts.length === 3) {
      if (dateParts[0].length === 4) { // YYYY-MM-DD
          [year, month, day] = dateParts.map(Number);
      } else { // MM/DD/YYYY
          [month, day, year] = dateParts.map(Number);
      }
  } else {
      return new Date('invalid');
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return new Date('invalid');
  }

  let timeStr = (order.pickupTime || '').split('-')[0].trim().toLowerCase();
  const hasAmPm = timeStr.includes('am') || timeStr.includes('pm');
  let [hoursStr, minutesStr] = timeStr.replace('am', '').replace('pm', '').split(':');

  let hours = parseInt(hoursStr, 10);
  let minutes = parseInt(minutesStr, 10);

  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;

  if (hasAmPm && timeStr.includes('pm') && hours < 12) {
    hours += 12;
  } else if (hasAmPm && timeStr.includes('am') && hours === 12) { // 12am is 00 hours
    hours = 0;
  } else if (!hasAmPm && hours > 0 && hours < 8) { // Assumption for times like '4:30' without AM/PM are likely afternoon
    hours += 12;
  }
  
  // JavaScript's Date constructor uses a 0-indexed month
  return new Date(year, month - 1, day, hours, minutes);
};
