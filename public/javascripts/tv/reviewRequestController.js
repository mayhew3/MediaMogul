angular.module('mediaMogulApp')
  .controller('reviewRequestController', ['$log', 'seriesRequest', '$uibModalInstance', 'LockService', '$http',
    'postAddCallback',
    function($log, seriesRequest, $uibModalInstance, LockService, $http, postAddCallback) {
      var self = this;

      self.LockService = LockService;
      self.seriesRequest = seriesRequest;

      self.handling = null;

      function isValidHandling() {
        return _.isString(self.handling) && _.contains(['approved', 'rejected'], self.handling);
      }

      self.getHandlingButtonClass = function(handling) {
        return self.handling === handling ? "btn btn-success" : "btn btn-primary";
      };


      self.ok = function() {
        if (isValidHandling()) {
          $http.post('/api/handleSeriesRequest', {
            handling: self.handling,
            tvdb_id: self.seriesRequest.tvdb_series_ext_id
          }).then(function() {
            postAddCallback(self.seriesRequest, self.handling);
            $uibModalInstance.close();
          });
        } else {
          throw new Error('Cannot execute handling with value: ' + self.handling);
        }
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]
  );
