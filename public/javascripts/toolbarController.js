(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('toolbar', toolbar);

  function toolbar() {
    return {
      templateUrl: 'views/toolbar.html',
      controller: toolbarController,
      controllerAs: 'toolbar'
    }
  }

  function toolbarController(LockService, store, $location) {
    var self = this;
    self.login = login;
    self.logout = logout;

    self.selectedLink = 'TV';

    self.LockService = LockService;
    self.lock = LockService.lock;

    self.getLinkClass = function(label) {
      return (label === self.selectedLink) ? 'active' : '';
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