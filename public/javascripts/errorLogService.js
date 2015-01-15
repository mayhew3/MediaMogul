function ErrorLogService($log, $http) {
  var errorlogs = [];


  this.updateErrorLogs = function() {
    return $http.get('/errorlog/list').then(function (response) {
      $log.debug("Errors returned " + response.data.length);
      errorlogs = response.data;
    }, function (errResponse) {
      console.error('Error while fetching error logs.');
    });
  };

  this.getErrorLogs = function () {
    return errorlogs;
  };

  this.setChosenName = function(logID, chosenName) {
    $http.post('/errorlog/setChosenName', {errorLogID: logID, chosenName: chosenName});
  };

  this.ignoreError = function(logID, ignoreError) {
    $http.post('/errorlog/ignoreError', {errorLogID: logID, ignoreError: ignoreError});
  }
}

angular.module('mediaMogulApp')
  .service('ErrorLogService', ['$log', '$http', ErrorLogService]);