angular.module('mediaMogulApp')
  .filter("filterByTitle", function() {
    return function (shows, titleFragment) {
      return _.filter(shows, function(show) {
        return titleFragment === undefined || show.title.toLowerCase().indexOf(titleFragment.toLowerCase()) > -1;
      });
    }
  });