angular.module('mediaMogulApp')
  .controller('modifyPosterController', ['series', 'tvdb_poster', 'previous_poster', 'alternate_poster', '$log', '$http', '$uibModalInstance',
    'EpisodeService', '$q', 'LockService',
    function(series, tvdb_poster, previous_poster, alternate_poster, $log, $http, $uibModalInstance, EpisodeService, $q, LockService) {
      const self = this;

      self.series = series;
      self.tvdb_poster = tvdb_poster;
      self.previous_poster = previous_poster;
      self.alternate_poster = alternate_poster;

      self.LockService = LockService;

      self.chooseFavorite = function() {
        addOrUpdatePoster().then(() => {
          $uibModalInstance.close()
        });
      };

      self.changeDefault = async function() {
        if (self.LockService.isAdmin()) {
          await EpisodeService.changeDefaultPoster(self.series, self.tvdb_poster);
        }
        $uibModalInstance.close();
      };

      self.toggleHidden = async function() {
        const newHidden = !self.tvdb_poster.hidden ? new Date : null;
        const newPerson = !self.tvdb_poster.hidden ? self.LockService.getPersonID() : null;
        const body = {
          tvdb_poster_id: self.tvdb_poster.tvdb_poster_id,
          hidden: newHidden,
          person_id: newPerson
        };
        await $http.post('/api/posterHide', body);
        self.tvdb_poster.hidden = newHidden;
        if (!!newHidden && !!self.alternate_poster) {
          await EpisodeService.changeDefaultPoster(self.series, self.alternate_poster);
        }
        $uibModalInstance.close();
      };

      self.showMakeDefaultButton = function() {
        return self.LockService.isAdmin() && isNotDefault();
      };
      
      function isNotDefault() {
        return self.series.poster !== tvdb_poster.poster;
      }

      self.hasChangedFromPrevious = function() {
        return !self.previous_poster ||
          self.tvdb_poster.tvdb_poster_id !== self.previous_poster.tvdb_poster_id;
      };
 
      function addOrUpdatePoster() {
        return $q(resolve => {
          if (self.hasChangedFromPrevious()) {
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
        $uibModalInstance.close();
      };
    }]);
