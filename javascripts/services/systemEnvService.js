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

  self.getEnvName = async function() {
    if (!envName) {
      await populateEnvName();
    }
    return envName;
  };

  self.isInTestMode = function() {
    return envName === 'test';
  };

  async function populateEnvName() {
    const result = await $http.get('/api/serverEnv');
    envName = result.data.envName;
    _.each(callbacks, callback => callback(envName));
    ArrayService.emptyArray(callbacks);
  }

  populateEnvName();

}

