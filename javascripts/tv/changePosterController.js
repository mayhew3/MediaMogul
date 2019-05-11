angular.module('mediaMogulApp')
  .controller('changePosterController', ['$log', '$http', 'EpisodeService', '$uibModalInstance', 'series', '$uibModal',
    '$filter', 'LockService', 'ArrayService',
    function($log, $http, EpisodeService, $uibModalInstance, series, $uibModal, $filter, LockService, ArrayService) {
      const self = this;

      self.LockService = LockService;

      self.series = series;
      self.allPosters = [];

      self.selectedPoster = null;
      self.defaultPoster = null;

      $http.get('/api/allPosters', {params: {tvdb_series_id: series.tvdb_series_id}}).then(function(response) {
        $log.debug(response.data.length + " posters found for series tvdb id " + series.tvdb_series_id);
        const allPosters = response.data;

        self.defaultPoster = _.findWhere(allPosters, {poster_path: series.poster});
        if (!!self.series.personSeries.poster) {
          self.selectedPoster = _.findWhere(allPosters, {id: series.personSeries.poster.id});
        } else {
          self.selectedPoster = self.defaultPoster;
        }

        ArrayService.refreshArray(self.allPosters, allPosters);
      });


      self.posterStyle = function(poster) {
        if (poster === self.selectedPoster) {
          return {"border": "solid limegreen"};
        } else if (poster === self.defaultPoster) {
          return {"border": "solid yellow"};
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

      function hasPreviousPoster() {
        return !!self.series.personSeries && !!self.series.personSeries.poster;
      }

      function getPreviousSelectedPoster() {
        return hasPreviousPoster() ? self.series.personSeries.poster : self.defaultPoster;
      }

      function hasChangedFromPrevious() {
        return self.selectedPoster.id !== getPreviousSelectedPoster().id;
      }

      self.ok = function() {
        if (hasChangedFromPrevious()) {
          const changedFields = {
            tvdb_poster_id: self.selectedPoster.id
          };
          EpisodeService.updatePersonSeries(series.id, changedFields).then(function() {
            series.personSeries.poster = {
              id: self.selectedPoster.id,
              poster: self.selectedPoster.poster_path,
              cloud_poster: self.selectedPoster.cloud_poster
            };
          });
        }
        $uibModalInstance.close();
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);
