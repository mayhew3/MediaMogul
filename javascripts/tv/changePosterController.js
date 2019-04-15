angular.module('mediaMogulApp')
  .controller('changePosterController', ['$log', '$http', 'EpisodeService', '$uibModalInstance', 'series', '$uibModal',
    '$filter', 'LockService', 'ArrayService',
    function($log, $http, EpisodeService, $uibModalInstance, series, $uibModal, $filter, LockService, ArrayService) {
      const self = this;

      self.LockService = LockService;

      self.series = series;
      self.allPosters = [];

      self.selectedPoster = null;

      $http.get('/allPosters', {params: {tvdb_series_id: series.tvdb_series_id}}).then(function(response) {
        $log.debug(response.data.length + " posters found for series tvdb id " + series.tvdb_series_id);
        const allPosters = response.data;

        allPosters.forEach(function (poster) {
          if (series.poster === poster.poster_path) {
            self.selectedPoster = poster;
          }
        });

        ArrayService.refreshArray(self.allPosters, allPosters);
      });


      self.posterStyle = function(poster) {
        if (poster === self.selectedPoster) {
          return {"border": "solid limegreen"};
        } else {
          return {"border": "solid gray"};
        }
      };

      self.posterInfo = {
        extraStyles: self.posterStyle
      };

      self.selectPoster = function(poster) {
        self.selectedPoster = poster;
      };


      self.ok = function() {
        if (self.selectedPoster.poster_path !== series.poster) {
          var changedFields = {
            poster: self.selectedPoster.poster_path,
            cloud_poster: self.selectedPoster.cloud_poster
          };
          EpisodeService.updateSeries(series.id, changedFields).then(function() {
            series.poster = self.selectedPoster.poster_path;
            series.cloud_poster = self.selectedPoster.cloud_poster;
            series.imageDoesNotExist = !series.poster;
            EpisodeService.updatePosterLocation(series);
          });
        }
        $uibModalInstance.close();
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);
