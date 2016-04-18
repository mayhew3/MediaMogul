angular.module('mediaMogulApp')
  .controller('errorLogController', ['$log', 'ErrorLogService',
  function($log, ErrorLogService) {
    var self = this;

    self.setChosenName = function(errorLog) {
      ErrorLogService.setChosenName(errorLog.id, errorLog.chosen_name);
    };

    self.ignoreError = function(errorLog) {
      ErrorLogService.ignoreError(errorLog.id, errorLog.ignore_error);
    };

    self.chooseTiVo = function(errorLog) {
      errorLog.chosen_name = errorLog.tivo_name;
    };

    self.chooseTVDB = function(errorLog) {
      errorLog.chosen_name = errorLog.tvdb_name;
    };

    ErrorLogService.updateErrorLogs().then(function() {
      self.errorLogs = ErrorLogService.getErrorLogs();
      $log.debug("Controller has " + self.errorLogs.length + " entries.");
    });
  }
]);