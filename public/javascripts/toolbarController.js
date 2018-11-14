(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('toolbar', toolbar);

  function toolbar() {
    return {
      templateUrl: 'views/toolbar.html',
      controller: ['LockService', 'store', '$location', 'NavHelperService', toolbarController],
      controllerAs: 'toolbar'
    }
  }

  function toolbarController(LockService, store, $location, NavHelperService) {
    var self = this;
    self.login = login;
    self.logout = logout;

    self.NavHelperService = NavHelperService;

    self.LockService = LockService;
    self.lock = LockService.lock;

    self.getLinkClass = function(label) {
      return (self.NavHelperService.isSelected(label)) ? 'active' : '';
    };

    function login() {
      console.log("SHOWING");
      self.lock.show();
    }

    function logout() {
      LockService.logout();
      $location.path('/');
    }


  }

})();