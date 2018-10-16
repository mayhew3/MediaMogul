angular.module('mediaMogulApp')
  .controller('changePosterController', ['$log', 'GamesService', '$uibModalInstance', 'series', '$uibModal', '$filter', 'LockService',
    function($log, GamesService, $uibModalInstance, series, $uibModal, $filter, LockService) {
      var self = this;

      self.LockService = LockService;

      self.series = series;
      self.allPosters = [];

      self.selectedPoster = null;

      GamesService.updateAllPosters(self.series).then(function() {
        self.allPosters = GamesService.getAllPosters();
        $log.debug("Updated " + self.allPosters.length + " posters.");

        self.allPosters.forEach(function (poster) {
          if (series.poster === poster.poster_path) {
            self.selectedPoster = poster;
          }
        });
      });


      self.posterStyle = function(poster) {
        if (poster === self.selectedPoster) {
          return {"border": "solid limegreen"};
        } else {
          return {"border": "solid gray"};
        }
      };

      self.selectPoster = function(poster) {
        self.selectedPoster = poster;
      };


      self.ok = function() {
        if (self.selectedPoster.poster_path !== series.poster) {
          var changedFields = {
            poster: self.selectedPoster.poster_path
          };
          GamesService.updateSeries(series.id, changedFields).then(function() {
            series.poster = self.selectedPoster.poster_path;
            series.imageDoesNotExist = !series.poster;
            series.posterResolved = self.selectedPoster.posterResolved;
          });
        }
        $uibModalInstance.close();
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);