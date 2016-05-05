function ErrorLogService($log, $http) {
  var errorlogs = [];


  this.updateErrorLogs = function() {
    return $http.get('/errorlog/list').then(function (response) {
      $log.debug("Errors returned " + response.data.length);
      errorlogs = response.data;
    }, function (errResponse) {
      console.error('Error while fetching error logs: ' + errResponse);
    });
  };

  this.getErrorLogs = function () {
    return errorlogs;
  };

  this.setChosenName = function(logID, chosenName) {
    var changedFields = {
      chosen_name: chosenName
    };
    $http.post('/errorlog/updateErrorLog', {errorLogID: logID, ChangedFields: changedFields});
  };

  this.ignoreError = function(logID, ignoreError) {
    var changedFields = {
      ignore_error: ignoreError
    };
    $http.post('/errorlog/updateErrorLog', {errorLogID: logID, ChangedFields: changedFields});
  }
}

angular.module('mediaMogulApp')
  .service('ErrorLogService', ['$log', '$http', ErrorLogService]);