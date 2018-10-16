angular.module('mediaMogulApp')
  .controller('topGamesController', ['$log', 'LockService',
    function($log, LockService) {
      var self = this;

      self.LockService = LockService;

    }
  ]);