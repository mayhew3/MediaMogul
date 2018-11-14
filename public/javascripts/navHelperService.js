angular.module('mediaMogulApp')
  .service('NavHelperService', [NavHelperService]);
function NavHelperService() {
  var self = this;

  /* TOP-LEVEL NAV */

  self.selectedNav = null;

  self.isSelected = function(nav) {
    return nav === self.selectedNav;
  };

  self.changeSelectedNav = function(nav) {
    self.selectedNav = nav;
  };


  /* TV GROUPS */

  self.selectedTVGroup = null;

  self.getSelectedTVGroup = function() {
    return self.selectedTVGroup;
  };

  self.changeSelectedTVGroup = function(tv_group_id) {
    self.selectedTVGroup = parseInt(tv_group_id);
  };
}

