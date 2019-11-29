angular.module('mediaMogulApp')
  .service('DateService', ['$filter', DateService]);
function DateService($filter) {
  const self = this;

  self.getDateFormat = function(date) {

    const thisYear = (new Date).getFullYear();

    if (date !== null) {
      const year = new Date(date).getFullYear();

      if (year === thisYear) {
        return 'EEE M/d';
      } else {
        return 'yyyy.M.d';
      }
    }
    return 'yyyy.M.d';
  };

  self.formatShortTime = function(timeString) {
    const minutesPart = $filter('date')(timeString, 'mm');
    const timeFormat = (minutesPart === '00') ? 'EEEE ha' : 'EEEE h:mm a';
    return $filter('date')(timeString, timeFormat);
  };

  self.formatDateForDatabase = function(unformattedDate) {
    let originalDate = (unformattedDate === '' || unformattedDate === null) ? null :
      new Date(unformattedDate);
    if (originalDate !== null) {
      originalDate.setHours(0, 0, 0, 0);
    }
    return originalDate;
  };

  self.formatDateStringForInput = function(dateString) {
    return dateString === null ?
      null :
      new Date(dateString).toLocaleDateString("en-US", options);
  };

  self.getFormattedDate = function(date) {
    return $filter('date')(date, self.getDateFormat(date), 'America/Los_Angeles');
  };

  self.dateIsWithinLastDays = function(referenceDate, daysAgo) {
    if (referenceDate === null || _.isUndefined(referenceDate)) {
      return false;
    }

    return moment().subtract(daysAgo, 'day').isBefore(moment(referenceDate));
  };

  self.dateIsInNextDays = function(referenceDate, days) {
    if (referenceDate === null || _.isUndefined(referenceDate)) {
      return false;
    }

    return moment().add(days, 'day').isAfter(moment(referenceDate));
  };

  self.datesEqual = function(date1, date2) {
    const moment1 = moment(date1);
    const moment2 = moment(date2);
    return moment1.isSame(moment2);
  };

}
