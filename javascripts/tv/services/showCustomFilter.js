angular.module('mediaMogulApp')
  .filter("showQuickFilter", function() {
    return function (shows, titleFragment) {
      return _.filter(shows, show => {
        if (!!show.fakeCatchAll) {
          show.inputValue = titleFragment;
        }
        return titleFragment === undefined ||
          !!show.title && show.title.toLowerCase().indexOf(titleFragment.toLowerCase()) > -1 ||
          !!show.fakeCatchAll;
      });
    }
  });
