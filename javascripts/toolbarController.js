(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('toolbar', toolbar);

  function toolbar() {
    return {
      templateUrl: 'views/toolbar.html',
      controller: ['LockService', 'store', '$location', 'NavHelperService', 'ExternalServicesService',
        'SystemVarsService',
        toolbarController],
      controllerAs: 'toolbar'
    }
  }

  function toolbarController(LockService, store, $location, NavHelperService, ExternalServicesService,
                             SystemVarsService) {
    const self = this;
    self.login = login;
    self.logout = logout;

    self.LockService = LockService;
    self.lock = LockService.lock;

    self.NavHelperService = NavHelperService;
    self.ExternalServicesService = ExternalServicesService;
    self.SystemVarsService = SystemVarsService;

    self.getEnvName = function() {
      return self.SystemVarsService.getVar('envName');
    };

    self.getDisplayEnvName = function() {
      const envName = self.getEnvName();
      if (envName === null || envName === 'heroku') {
        return '';
      } else if (envName === 'heroku-staging') {
        return 'Staging';
      } else {
        return envName;
      }
    };

    self.getNavbarClass = function() {
      const envName = self.getEnvName();
      if (envName === null || envName === 'heroku') {
        return 'navbar-default';
      } else if (envName === 'heroku-staging') {
        return 'navbar-default stagingNavbar';
      } else {
        return 'navbar-default localNavbar';
      }
    };

    self.getLinkClass = function(label) {
      return (self.NavHelperService.isSelected(label)) ? 'active' : '';
    };

    function isProduction() {
      const envName = self.getEnvName();
      return !envName || envName === 'heroku';
    }

    self.getNumberOfOverdueServices = function() {
      return self.ExternalServicesService.getNumberOfOverdueServices();
    };

    self.showServicesBadge = function() {
      return isProduction() && self.getNumberOfOverdueServices() > 0;
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
