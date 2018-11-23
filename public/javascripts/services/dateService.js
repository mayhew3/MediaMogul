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

  self.getFormattedDate = function(date) {
    return $filter('date')(date, self.getDateFormat(date), 'America/Los_Angeles');
  };
}