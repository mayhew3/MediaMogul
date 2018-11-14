angular.module('mediaMogulApp')
  .service('NavHelperService', [NavHelperService]);
function NavHelperService() {
  var self = this;

  self.selectedNav = 'TV';

  self.getSelectedNav = function() {
    return self.selectedNav;
  };

  self.isSelected = function(nav) {
    return nav === self.selectedNav;
  };

  self.changeSelectedNav = function(nav) {
    self.selectedNav = nav;
  };

}

