
export interface Holiday {
  date: Date;
  name: string;
}

/**
 * Helper to find the Nth occurrence of a specific weekday in a month.
 * @param year Full year
 * @param month 0-indexed month (0 = Jan, 11 = Dec)
 * @param dayOfWeek 0 = Sun, 1 = Mon, ..., 6 = Sat
 * @param n The Nth occurrence (e.g., 1 for 1st, 3 for 3rd)
 */
const getNthWeekday = (year: number, month: number, dayOfWeek: number, n: number): Date => {
  const date = new Date(year, month, 1);
  let count = 0;
  while (date.getMonth() === month) {
    if (date.getDay() === dayOfWeek) {
      count++;
      if (count === n) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }
  return new Date(year, month, 1); // Fallback
};

/**
 * Helper to find the last occurrence of a specific weekday in a month.
 */
const getLastWeekday = (year: number, month: number, dayOfWeek: number): Date => {
    const date = new Date(year, month + 1, 0); // Last day of month
    while (date.getDay() !== dayOfWeek) {
        date.setDate(date.getDate() - 1);
    }
    return new Date(date);
}

/**
 * Returns a list of major US holidays for a given year.
 */
export const getUSHolidays = (year: number): Holiday[] => {
  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: "New Year's Day" },
    { date: getNthWeekday(year, 0, 1, 3), name: "MLK Jr. Day" }, // 3rd Mon Jan
    { date: getNthWeekday(year, 1, 1, 3), name: "Presidents' Day" }, // 3rd Mon Feb
    { date: getLastWeekday(year, 4, 1), name: "Memorial Day" }, // Last Mon May
    { date: new Date(year, 5, 19), name: "Juneteenth" },
    { date: new Date(year, 6, 4), name: "Independence Day" },
    { date: getNthWeekday(year, 8, 1, 1), name: "Labor Day" }, // 1st Mon Sep
    { date: getNthWeekday(year, 9, 1, 2), name: "Columbus Day" }, // 2nd Mon Oct
    { date: new Date(year, 10, 11), name: "Veterans Day" },
    { date: getNthWeekday(year, 10, 4, 4), name: "Thanksgiving" }, // 4th Thu Nov
    { date: new Date(year, 11, 25), name: "Christmas Day" },
  ];
  
  // Adjust for weekend observations if needed in future, currently purely date-based.
  return holidays;
};
