angular.module('mediaMogulApp')
    .service('SystemEnvService', ['$http', 'ArrayService', SystemEnvService]);
function SystemEnvService($http, ArrayService) {
  const self = this;

  let envName;

  const callbacks = [];

  self.waitForEnvName = function(callback) {
    if (!!envName) {
      callback(envName);
    } else {
      callbacks.push(callback);
    }
  };

  self.isInTestMode = function() {
    return envName === 'test';
  };

  $http.get('/api/serverEnv').then((result) => {
    envName = result.data.envName;
    _.each(callbacks, callback => callback(envName));
    ArrayService.emptyArray(callbacks);
  });

}

