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

        updateDefaultPoster(allPosters);
        if (!!self.series.my_poster) {
          self.selectedPoster = _.findWhere(allPosters, {tvdb_poster_id: series.my_poster.tvdb_poster_id});
        } else {
          self.selectedPoster = self.defaultPoster;
        }

        ArrayService.refreshArray(self.allPosters, allPosters);
      });

      self.posterFilter = function(poster) {
        return !poster.imageDoesNotExist && self.isUnhiddenOrRecentlyHiddenOrFavorite(poster);
      };

      function updateDefaultPoster(allPosters) {
        self.defaultPoster = getDefaultPoster(allPosters);
      }

      function getDefaultPoster(allPosters) {
        if (self.series.cloud_poster) {
          return _.findWhere(allPosters, {cloud_poster: series.cloud_poster});
        } else {
          return _.findWhere(allPosters, {poster: series.poster});
        }
      }

      // get the most recent unhidden poster in case this poster becomes hidden.
      function getAlternateDefaultIfNeeded(poster) {
        if (self.defaultPoster.tvdb_poster_id !== poster.tvdb_poster_id) {
          return null;
        }

        const eligiblePosters = _.filter(self.allPosters, allPoster => {
          return !allPoster.hidden && allPoster.tvdb_poster_id !== poster.tvdb_poster_id
        });
        return _.last(eligiblePosters);
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
        extraStyles: self.posterStyle,
        textOverlay: textOverlay
      };

      function textOverlay(poster) {
        return isRecentlyHidden(poster) ? 'Flagged' : null;
      }

      function addRecentlyHidden(poster) {
        const existing = _.findWhere(self.recentlyHidden, {tvdb_poster_id: poster.tvdb_poster_id});
        if (!existing) {
          self.recentlyHidden.push(poster);
        }
      }

      self.selectPoster = function(poster) {
        const alternatePoster = getAlternateDefaultIfNeeded(poster);
        const noOverride = posterEquals(self.defaultPoster, self.selectedPoster);
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
              addRecentlyHidden(poster);
              if (!!alternatePoster) {
                const changedFields = {
                  poster: alternatePoster.poster,
                  cloud_poster: alternatePoster.cloud_poster
                };
                EpisodeService.updateSeries(self.series.id, changedFields).then(() => {
                  self.defaultPoster = alternatePoster;
                  if (noOverride) {
                    self.selectedPoster = alternatePoster;
                  }
                  self.series.poster = alternatePoster.poster;
                  self.series.cloud_poster = alternatePoster.cloud_poster;
                });
              }
            }
            if (posterEquals(poster, self.series.my_poster)) {
              if (!!self.selectedPoster.hidden) {
                addRecentlyHidden(self.selectedPoster);
              } else if (isRecentlyHidden(poster)) {
                ArrayService.removeFromArray(self.recentlyHidden, poster);
              }
              self.selectedPoster = poster;
            }
          });
      };

      function isRecentlyHidden(poster) {
        return _.contains(self.recentlyHidden, poster)
      }

      function isFavorite(poster) {
        return posterEquals(self.selectedPoster, poster);
      }

      function posterEquals(poster1, poster2) {
        return poster1.tvdb_poster_id === poster2.tvdb_poster_id;
      }

      self.isUnhiddenOrRecentlyHiddenOrFavorite = function(poster) {
        return !poster.hidden || isRecentlyHidden(poster) || isFavorite(poster);
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
