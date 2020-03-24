(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('toolbar', toolbar);

  function toolbar() {
    return {
      templateUrl: 'views/toolbar.html',
      controller: ['LockService', 'store', '$location', 'NavHelperService', 'ExternalServicesService',
        'SystemVarsService', 'SocketService', 'TVDBApprovalService',
        toolbarController],
      controllerAs: 'toolbar'
    }
  }

  function toolbarController(LockService, store, $location, NavHelperService, ExternalServicesService,
                             SystemVarsService, SocketService, TVDBApprovalService) {
    const self = this;
    self.login = login;
    self.logout = logout;

    self.LockService = LockService;
    self.lock = LockService.lock;
    self.SocketService = SocketService;

    self.NavHelperService = NavHelperService;
    self.ExternalServicesService = ExternalServicesService;
    self.TVDBApprovalService = TVDBApprovalService;
    self.SystemVarsService = SystemVarsService;

    self.getEnvName = function() {
      return self.SystemVarsService.getVar('envName');
    };

    self.isSocketConnected = function() {
      return !!self.SocketService && !!self.SocketService.isConnected();
    };

    self.socketConnect = function() {
      self.SocketService.connect();
    };

    self.socketDisconnect = function() {
      self.SocketService.disconnect();
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
      } else if (envName === 'test') {
        return 'navbar-default testNavbar';
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

    self.getNumberOfPendingEpisodes = function() {
      return self.TVDBApprovalService.getNumberOfPendingEpisodes();
    };

    self.showServicesBadge = function() {
      return isProduction() && self.getNumberOfOverdueServices() > 0 && self.isSocketConnected();
    };

    self.showPendingBadge = function() {
      return self.getNumberOfPendingEpisodes() > 0 && self.isSocketConnected();
    };

    function login() {
      LockService.login();
    }

    self.showLoginAsAdmin = () => {
      let inTestMode = LockService.isInTestMode();
      let authenticated = LockService.isAuthenticated();
      return inTestMode && !authenticated;
    };

    self.loginAsAdmin = () => {
      LockService.loginAsAdminForTest();
    };

    function logout() {
      LockService.logout();
      $location.path('/');
    }


  }

})();
