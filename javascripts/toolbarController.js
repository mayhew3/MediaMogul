(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('toolbar', toolbar);

  function toolbar() {
    return {
      templateUrl: 'views/toolbar.html',
      controller: ['LockService', 'store', '$location', 'NavHelperService', 'ExternalServicesService',
        toolbarController],
      controllerAs: 'toolbar'
    }
  }

  function toolbarController(LockService, store, $location, NavHelperService, ExternalServicesService) {
    const self = this;
    self.login = login;
    self.logout = logout;

    self.NavHelperService = NavHelperService;
    self.ExternalServicesService = ExternalServicesService;

    self.LockService = LockService;
    self.lock = LockService.lock;

    self.getLinkClass = function(label) {
      return (self.NavHelperService.isSelected(label)) ? 'active' : '';
    };

    self.getNumberOfOverdueServices = function() {
      return self.ExternalServicesService.getNumberOfOverdueServices();
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
