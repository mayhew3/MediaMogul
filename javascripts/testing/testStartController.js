angular.module('mediaMogulApp')
  .controller('testStartController', ['LockService', 'SystemEnvService', '$state',
    function(LockService, SystemEnvService, $state) {
      const self = this;

      self.loginError = undefined;

      SystemEnvService.waitForEnvName(envName => {
        if (envName === 'test') {
          LockService.loginAsTest()
            .then(() => $state.go('tv.shows.my.dashboard'))
            .catch(err => self.loginError = err.message);
        } else {
          $state.go('home');
        }
      });
    }]);
