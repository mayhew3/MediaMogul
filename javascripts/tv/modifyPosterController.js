angular.module('mediaMogulApp')
  .controller('modifyPosterController', ['series', 'tvdb_poster', 'previous_poster', '$log', '$http', '$uibModalInstance',
    'EpisodeService', '$q', 'LockService',
    function(series, tvdb_poster, previous_poster, $log, $http, $uibModalInstance, EpisodeService, $q, LockService) {
      const self = this;

      self.series = series;
      self.tvdb_poster = tvdb_poster;
      self.previous_poster = previous_poster;

      self.LockService = LockService;

      self.chooseFavorite = function() {
        addOrUpdatePoster().then(() => {

          $uibModalInstance.close()
        });
      };

      self.toggleHidden = function() {
        const newHidden = !self.tvdb_poster.hidden ? new Date : null;
        const body = {
          tvdb_poster_id: self.tvdb_poster.tvdb_poster_id,
          hidden: newHidden
        };
        $http.post('/api/posterHide', body).then(() => {
          self.tvdb_poster.hidden = newHidden;
          $uibModalInstance.close();
        });
      };

      function hasChangedFromPrevious() {
        return !self.previous_poster ||
          self.tvdb_poster.tvdb_poster_id !== self.previous_poster.tvdb_poster_id;
      }
 
      function addOrUpdatePoster() {
        return $q(resolve => {
          if (hasChangedFromPrevious()) {
            if (!!self.series.my_poster) {
              EpisodeService.updateMyPoster(self.series.my_poster.id, self.tvdb_poster.tvdb_poster_id).then(() => {
                const myPoster = self.series.my_poster;
                myPoster.tvdb_poster_id = self.tvdb_poster.tvdb_poster_id;
                myPoster.poster = self.tvdb_poster.poster;
                myPoster.cloud_poster = self.tvdb_poster.cloud_poster;

                resolve();
              });
            } else {
              EpisodeService.addPoster(self.series.id, self.tvdb_poster.tvdb_poster_id).then(results => {
                const person_poster_id = results.data[0].id;
                self.series.my_poster = self.tvdb_poster;
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
