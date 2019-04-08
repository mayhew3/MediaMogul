angular.module('mediaMogulApp')
  .controller('topGamesController', ['$log', 'LockService', 'NavHelperService',
    function($log, LockService, NavHelperService) {
      var self = this;

      self.LockService = LockService;

      NavHelperService.changeSelectedNav('Games');
    }
  ]);