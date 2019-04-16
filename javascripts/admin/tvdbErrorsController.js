angular.module('mediaMogulApp')
  .controller('tvdbErrorsController', ['$log', '$http', '$uibModal', 'EpisodeService', 'LockService', 'ArrayService',
    function($log, $http, $uibModal, EpisodeService, LockService, ArrayService) {
      const self = this;

      self.LockService = LockService;

      self.tvdbErrors = [];

      $http.get('/api/tvdbErrors').then(function (payload) {
        const tvdbErrors = payload.data;
        tvdbErrors.forEach(function(tvdb_error) {
          let exceptionClass = tvdb_error.exception_class;
          let exceptionParts = exceptionClass.split('.');
          tvdb_error.shortClass = exceptionParts[exceptionParts.length -1];
        });
        ArrayService.refreshArray(self.tvdbErrors, tvdbErrors);
      });

    }
  ]);
