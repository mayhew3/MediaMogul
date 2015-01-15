angular.module('mediaMogulApp')
  .controller('errorLogController', ['$log', 'ErrorLogService',
  function($log, ErrorLogService) {
    var self = this;

    self.setChosenName = function(errorLog) {
      ErrorLogService.setChosenName(errorLog._id, errorLog.ChosenName);
    };

    self.ignoreError = function(errorLog) {
      ErrorLogService.ignoreError(errorLog._id, errorLog.IgnoreError);
    };

    self.chooseTiVo = function(errorLog) {
      errorLog.ChosenName = errorLog.TiVoName;
    };

    self.chooseTVDB = function(errorLog) {
      errorLog.ChosenName = errorLog.TVDBName;
    };

    ErrorLogService.updateErrorLogs().then(function() {
      self.errorLogs = ErrorLogService.getErrorLogs();
      $log.debug("Controller has " + self.errorLogs.length + " entries.");
    });
  }
]);