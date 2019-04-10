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

  self.selectedTVGroupID = null;

  self.getSelectedTVGroupID = function() {
    return self.selectedTVGroupID;
  };

  self.changeSelectedTVGroup = function(tv_group_id) {
    self.selectedTVGroupID = parseInt(tv_group_id);
  };
}

