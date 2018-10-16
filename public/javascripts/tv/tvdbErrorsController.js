angular.module('mediaMogulApp')
  .controller('tvdbErrorsController', ['$log', '$uibModal', 'GamesService', 'LockService',
    function($log, $uibModal, GamesService, LockService) {
      var self = this;

      self.LockService = LockService;

      self.tvdbErrors = [];

      GamesService.updateTVDBErrors().then(function() {
        self.tvdbErrors = GamesService.getTVDBErrors();
      });

    }
  ]);