angular.module('mediaMogulApp')
  .controller('changePosterController', ['$log', '$http', 'EpisodeService', '$uibModalInstance', 'series', '$uibModal',
    '$filter', 'LockService', 'ArrayService', '$q',
    function($log, $http, EpisodeService, $uibModalInstance, series, $uibModal, $filter, LockService, ArrayService, $q) {
      const self = this;

      self.LockService = LockService;

      self.series = series;
      self.allPosters = [];

      self.selectedPoster = null;
      self.defaultPoster = null;
      self.recentlyHidden = [];

      $http.get('/api/allPosters', {params: {tvdb_series_id: series.tvdb_series_id}}).then(function(response) {
        $log.debug(response.data.length + " posters found for series tvdb id " + series.tvdb_series_id);
        const allPosters = response.data;

        self.defaultPoster = getDefaultPoster(allPosters);
        if (!!self.series.my_poster) {
          self.selectedPoster = _.findWhere(allPosters, {tvdb_poster_id: series.my_poster.tvdb_poster_id});
        } else {
          self.selectedPoster = self.defaultPoster;
        }

        ArrayService.refreshArray(self.allPosters, allPosters);
      });

      self.posterFilter = function(poster) {
        return !poster.imageDoesNotExist && self.isUnhiddenOrRecentlyHidden(poster);
      };

      function getDefaultPoster(allPosters) {
        if (self.series.cloud_poster) {
          return _.findWhere(allPosters, {cloud_poster: series.cloud_poster});
        } else {
          return _.findWhere(allPosters, {poster: series.poster});
        }
      }

      self.posterStyle = function(poster) {
        if (poster === self.selectedPoster) {
          return {
            "border": "solid limegreen",
            "box-shadow": "0 0 30px limegreen"
          };
        } else if (poster === self.defaultPoster) {
          return {
            "border": "solid yellow"
          };
        } else if (!!poster.hidden) {
          return {
            "opacity": 0.5
          };
        } else {
          return {"border": "solid gray"};
        }
      };

      self.posterInfo = {
        extraStyles: self.posterStyle
      };

      self.selectPoster = function(poster) {
        $uibModal.open({
          templateUrl: 'views/tv/modifyPoster.html',
          controller: 'modifyPosterController as ctrl',
          size: 'sm',
          resolve: {
            series: function() {
              return self.series;
            },
            tvdb_poster: function() {
              return poster;
            },
            previous_poster: function() {
              return getPreviousSelectedPoster();
            },
          }
        }).result
          .then(() => {
            if (!!poster.hidden) {
              self.recentlyHidden.push(poster);
            }
            if (poster.tvdb_poster_id === self.series.my_poster.tvdb_poster_id) {
              self.selectedPoster = poster;
            }
          });
      };

      self.isUnhiddenOrRecentlyHidden = function(poster) {
        return !poster.hidden || _.contains(self.recentlyHidden, poster);
      };

      function hasPreviousPoster() {
        return !!self.series.my_poster;
      }

      function getPreviousSelectedPoster() {
        return hasPreviousPoster() ? self.series.my_poster : self.defaultPoster;
      }

      self.close = function() {
        $uibModalInstance.close();
      };
    }]);
