angular.module('mediaMogulApp')
  .controller('addGameController', ['$log', 'GamesService', '$uibModalInstance', 'LockService',
    function($log, GamesService, $uibModalInstance, LockService) {
      var self = this;

      self.LockService = LockService;

      self.game = {
        owned: 'owned'
      };

      self.gameExists = false;

      self.updateGameExists = function() {
        var title = self.game.title;
        var platform = self.game.platform;
        self.gameExists = !!GamesService.getGameWithTitleAndPlatform(title, platform);
      };


      self.ok = function() {
        self.game.date_added = new Date;
        var errorResponse = GamesService.addGame(self.game);
        if (errorResponse) {
          $log.debug("Error adding Game. Response: " + errorResponse);
        } else {
          $uibModalInstance.close();
        }
      };

      self.cancel = function() {
        $uibModalInstance.close();
      }
    }]);