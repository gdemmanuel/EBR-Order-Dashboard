
import { Order } from '../types';

/**
 * The single, robust source of truth for parsing an order's date and time string into a JavaScript Date object.
 * It gracefully handles null, undefined, or malformed date/time strings by returning an "Invalid Date" object.
 */
export const parseOrderDateTime = (order: Order): Date => {
  if (!order.pickupDate) {
    return new Date('invalid'); 
  }

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
  } else if (!hasAmPm && hours > 0 && hours < 8) { 
    hours += 12;
  }
  
  // JavaScript's Date constructor uses a 0-indexed month
  return new Date(year, month - 1, day, hours, minutes);
};

export const formatTime12Hour = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
};

/**
 * Ensures a time string is displayed in 12-hour format (e.g. 2:00 PM).
 * Handles inputs like "14:00" or "2:00 PM".
 */
export const formatTimeDisplay = (timeStr: string | undefined | null): string => {
    if (!timeStr) return '';
    
    // Normalize clean string
    const cleanStr = timeStr.trim();
    
    // Check if already AM/PM
    if (cleanStr.toLowerCase().match(/[a-z]/)) return cleanStr;

    // Assume 24h HH:MM
    const parts = cleanStr.split(':');
    if (parts.length < 2) return cleanStr;

    const [hoursStr, minutesStr] = parts;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return cleanStr;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minStr} ${ampm}`;
};

/**
 * Generates a list of time slots (Date objects) between start and end times.
 * @param dateStr YYYY-MM-DD
 * @param startTime "HH:MM" (24h)
 * @param endTime "HH:MM" (24h)
 * @param intervalMinutes number
 */
export const generateTimeSlots = (dateStr: string, startTime: string, endTime: string, intervalMinutes: number): string[] => {
    const slots: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const current = new Date(`${dateStr}T${startTime}:00`);
    const end = new Date(`${dateStr}T${endTime}:00`);
    
    // Safety break
    let iterations = 0;
    
    while (current <= end && iterations < 100) {
        slots.push(formatTime12Hour(current));
        current.setMinutes(current.getMinutes() + intervalMinutes);
        iterations++;
    }
    
    return slots;
};

export const normalizeDateStr = (input: string): string => {
    // Tries to convert MM/DD/YYYY to YYYY-MM-DD for consistent comparison
    // If already YYYY-MM-DD, returns as is.
    if (!input) return '';
    if (input.includes('-') && input.split('-')[0].length === 4) return input;
    
    const parts = input.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return input;
};

export const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    
    let y, m, d;

    // Handle YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        [y, m, d] = dateStr.split('-');
    } 
    // Handle MM/DD/YYYY or M/D/YYYY
    else if (dateStr.includes('/')) {
        [m, d, y] = dateStr.split('/');
    }
    // Handle MM-DD-YYYY or other hyphenated
    else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        // Check if first part is year (YYYY-MM-DD was handled by regex, this catches malformed or other ISO-like)
        if (parts[0].length === 4) {
             [y, m, d] = parts;
        } else {
             // Assume MM-DD-YYYY
             [m, d, y] = parts;
        }
    } else {
        return dateStr;
    }

    if (y && m && d) {
         // Force 2-digit padding and standard format MM/DD/YYYY
         return `${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}/${y}`;
    }
    
    return dateStr;
};