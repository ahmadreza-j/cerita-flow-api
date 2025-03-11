const jalaali = require('jalaali-js');

/**
 * Generates current Persian (Jalali) date in format YYYY/MM/DD
 */
function generatePersianDate() {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now);
  return `${jy}/${jm.toString().padStart(2, '0')}/${jd.toString().padStart(2, '0')}`;
}

/**
 * Generates current Persian (Jalali) time in format HH:MM:SS
 */
function generatePersianTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Converts Gregorian date to Persian (Jalali) date
 * @param {Date|string} date - Gregorian date (Date object or ISO string)
 * @returns {string} Persian date in format YYYY/MM/DD
 */
function toPersianDate(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const { jy, jm, jd } = jalaali.toJalaali(dateObj);
  return `${jy}/${jm.toString().padStart(2, '0')}/${jd.toString().padStart(2, '0')}`;
}

/**
 * Converts Persian (Jalali) date to Gregorian date
 * @param {string} persianDate - Persian date in format YYYY/MM/DD
 * @returns {Date} Gregorian date
 */
function toGregorianDate(persianDate) {
  const [jy, jm, jd] = persianDate.split('/').map(Number);
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd);
}

/**
 * Gets current Persian (Jalali) date and time
 * @returns {Object} Object containing date and time
 */
function getCurrentPersianDateTime() {
  return {
    date: generatePersianDate(),
    time: generatePersianTime()
  };
}

module.exports = {
  generatePersianDate,
  generatePersianTime,
  toPersianDate,
  toGregorianDate,
  getCurrentPersianDateTime
}; 