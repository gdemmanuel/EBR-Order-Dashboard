
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
 * Returns a list of major US holidays and Marketing/Social Media holidays for a given year.
 */
export const getUSHolidays = (year: number): Holiday[] => {
  const thanksgiving = getNthWeekday(year, 10, 4, 4); // 4th Thu Nov
  
  const addDays = (d: Date, days: number) => {
      const newDate = new Date(d);
      newDate.setDate(d.getDate() + days);
      return newDate;
  };

  const holidays: Holiday[] = [
    // January
    { date: new Date(year, 0, 1), name: "New Year's Day" },
    { date: getNthWeekday(year, 0, 1, 3), name: "MLK Jr. Day" },

    // February (Marketing Heavy)
    { date: new Date(year, 1, 9), name: "Nat. Pizza Day" },
    { date: getNthWeekday(year, 1, 0, 2), name: "Super Bowl Sun" }, // 2nd Sun Feb
    { date: new Date(year, 1, 13), name: "Galentine's Day" },
    { date: new Date(year, 1, 14), name: "Valentine's Day" },
    { date: getNthWeekday(year, 1, 1, 3), name: "Presidents' Day" },
    { date: new Date(year, 1, 22), name: "Nat. Margarita Day" },

    // March
    { date: new Date(year, 2, 8), name: "Intl. Women's Day" },
    { date: new Date(year, 2, 14), name: "Pi Day" },
    { date: new Date(year, 2, 17), name: "St. Patrick's Day" },

    // April
    { date: new Date(year, 3, 1), name: "April Fools" },
    { date: new Date(year, 3, 8), name: "Nat. Empanada Day" }, // Important!

    // May
    { date: new Date(year, 4, 4), name: "Star Wars Day" },
    { date: new Date(year, 4, 5), name: "Cinco de Mayo" },
    { date: getNthWeekday(year, 4, 0, 2), name: "Mother's Day" }, // 2nd Sun
    { date: getLastWeekday(year, 4, 1), name: "Memorial Day" }, // Last Mon

    // June
    { date: getNthWeekday(year, 5, 0, 3), name: "Father's Day" }, // 3rd Sun
    { date: new Date(year, 5, 19), name: "Juneteenth" },

    // July
    { date: new Date(year, 6, 4), name: "Independence Day" },
    { date: getNthWeekday(year, 6, 0, 3), name: "Nat. Ice Cream Day" }, // 3rd Sun

    // August
    // (Less common major marketing holidays, maybe Back to School varies)

    // September
    { date: getNthWeekday(year, 8, 1, 1), name: "Labor Day" }, // 1st Mon

    // October
    { date: new Date(year, 9, 4), name: "Nat. Taco Day" },
    { date: getNthWeekday(year, 9, 1, 2), name: "Columbus Day" }, // 2nd Mon
    { date: new Date(year, 9, 31), name: "Halloween" },

    // November
    { date: new Date(year, 10, 11), name: "Veterans Day" },
    { date: thanksgiving, name: "Thanksgiving" },
    { date: addDays(thanksgiving, 1), name: "Black Friday" },
    { date: addDays(thanksgiving, 2), name: "Small Biz Sat" },
    { date: addDays(thanksgiving, 4), name: "Cyber Monday" },

    // December
    { date: new Date(year, 11, 24), name: "Christmas Eve" },
    { date: new Date(year, 11, 25), name: "Christmas Day" },
    { date: new Date(year, 11, 31), name: "New Year's Eve" },
  ];
  
  return holidays;
};
