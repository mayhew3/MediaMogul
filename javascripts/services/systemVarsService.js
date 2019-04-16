angular.module('mediaMogulApp')
    .service('SystemVarsService', ['$http', 'LockService', 'ArrayService', SystemVarsService]);
function SystemVarsService($http, LockService, ArrayService) {
  const self = this;

  let varsReady = false;
  let vars;

  const onReadyCallbacks = [];

  LockService.addCallback(initialize);

  function initialize() {
    $http.get('/api/systemVars').then(response => {
      vars = response.data;
      varsReady = true;
      executeOnReadyCallbacks();
    });
  }

  function executeOnReadyCallbacks() {
    _.forEach(onReadyCallbacks, callback => callback());
    ArrayService.emptyArray(onReadyCallbacks);
  }

  self.getVars = function() {
    return vars;
  };

  self.getVar = function(key) {
    return varsReady ? vars[key] : null;
  };
}

