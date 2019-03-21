angular.module('mediaMogulApp')
  .controller('changePosterController', ['$log', 'EpisodeService', '$uibModalInstance', 'series', '$uibModal', '$filter', 'LockService',
    function($log, EpisodeService, $uibModalInstance, series, $uibModal, $filter, LockService) {
      var self = this;

      self.LockService = LockService;

      self.series = series;
      self.allPosters = [];

      self.selectedPoster = null;

      EpisodeService.updateAllPosters(self.series).then(function() {
        self.allPosters = EpisodeService.getAllPosters();
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

      self.tvdbPosterPath = function(poster) {
        if (poster.cloud_poster) {
          return 'https://res.cloudinary.com/media-mogul/image/upload/' + poster.cloud_poster;
        } else if (poster.poster_path) {
          return 'https://thetvdb.com/banners/' + poster.poster_path;
        } else {
          return 'images/GenericSeries.gif';
        }
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
