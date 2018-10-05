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

    self.LockService = LockService;
    self.lock = LockService.lock;

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