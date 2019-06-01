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
        return !poster.imageDoesNotExist;
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
        } else {
          return {"border": "solid gray"};
        }
      };

      self.posterInfo = {
        extraStyles: self.posterStyle
      };

      self.selectPoster = function(poster) {
        self.selectedPoster = poster;
        self.submitAndClose();
      };

      function hasPreviousPoster() {
        return !!self.series.my_poster;
      }

      function getPreviousSelectedPoster() {
        return hasPreviousPoster() ? self.series.my_poster : self.defaultPoster;
      }

      function hasChangedFromPrevious() {
        const previousSelectedPoster = getPreviousSelectedPoster();
        return !previousSelectedPoster ||
          self.selectedPoster.tvdb_poster_id !== previousSelectedPoster.tvdb_poster_id;
      }

      self.submitAndClose = function() {
        addOrUpdatePoster().then(() => $uibModalInstance.close());
      };

      function addOrUpdatePoster() {
        return $q(resolve => {
          if (hasChangedFromPrevious()) {
            if (!!self.series.my_poster) {
              EpisodeService.updateMyPoster(self.series.my_poster.id, self.selectedPoster.tvdb_poster_id).then(() => {
                const myPoster = self.series.my_poster;
                myPoster.tvdb_poster_id = self.selectedPoster.tvdb_poster_id;
                myPoster.poster = self.selectedPoster.poster;
                myPoster.cloud_poster = self.selectedPoster.cloud_poster;

                resolve();
              });
            } else {
              EpisodeService.addPoster(self.series.id, self.selectedPoster.tvdb_poster_id).then(results => {
                const person_poster_id = results.data[0].id;
                self.series.my_poster = self.selectedPoster;
                self.series.my_poster.person_poster_id = person_poster_id;
                resolve();
              });
            }
          } else {
            resolve();
          }
        });
      }

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);
