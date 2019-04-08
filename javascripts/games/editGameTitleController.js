angular.module('mediaMogulApp')
  .controller('editGameTitleController', ['$log', 'GamesService', '$uibModalInstance', 'game', 'igdb_redo', '$uibModal', '$filter', 'LockService',
    function($log, GamesService, $uibModalInstance, game, igdb_redo, $uibModal, $filter, LockService) {
      var self = this;

      self.LockService = LockService;

      self.game = game;

      self.originalTitle = game.title;
      self.interfaceTitle = game.title;

      self.ok = function() {
        if (self.originalTitle !== self.interfaceTitle) {
          var changedFields = {
            title: self.interfaceTitle
          };

          if (igdb_redo) {
            changedFields['igdb_failed'] = null;
          }

          GamesService.updateGame(game.id, changedFields).then(function() {
            game.title = self.interfaceTitle;

            if (igdb_redo) {
              game.igdb_failed = null;
            }
          });
        }

        $uibModalInstance.close();
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);