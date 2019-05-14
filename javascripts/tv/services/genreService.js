angular.module('mediaMogulApp')
  .service('GenreService', ['$http', 'ArrayService', '$q',
    function ($http, ArrayService, $q) {
      const self = this;
      let genres;

      self.updateGenres = function() {
        return $q((resolve, reject) => {
          $http.get('/api/genres').then(results => {
            if (!!genres) {
              ArrayService.refreshArray(genres, results.data);
            } else {
              genres = results.data;
            }
            resolve(genres);
          }).catch(err => reject(err));
        });
      };

      self.eventuallyGetGenres = function() {
        return $q(resolve => {
          if (!!genres) {
            resolve(genres);
          } else {
            self.updateGenres().then(results => resolve(results));
          }
        })
      };

      self.getGenres = function() {
        return genres;
      };
    }]);
