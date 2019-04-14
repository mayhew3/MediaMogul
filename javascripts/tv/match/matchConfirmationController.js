angular.module('mediaMogulApp')
  .controller('matchConfirmationController', ['$log', '$http', 'EpisodeService', '$uibModalInstance', 'series',
    '$uibModal', '$filter', 'LockService', 'ArrayService',
    function($log, $http, EpisodeService, $uibModalInstance, series, $uibModal, $filter, LockService, ArrayService) {
      var self = this;

      self.LockService = LockService;

      self.series = series;
      self.possibleMatches = [];

      self.selectedMatch = null;

      function amendPosterLocation(posterPath) {
        return posterPath ? 'https://res.cloudinary.com/media-mogul/image/upload/' + posterPath : 'images/GenericSeries.gif';
      }

      $http.get('/possibleMatches', {params: {SeriesId: self.series.id}}).then(function(response) {
        $log.debug("Possible matches returned " + response.data.length + " items.");
        const possibleMatches = response.data;

        possibleMatches.forEach(function (match) {
          match.posterResolved = amendPosterLocation(match.poster);
          if (self.series.tvdb_match_id === match.tvdb_series_ext_id) {
            self.selectedMatch = match;
          }
        });

        ArrayService.refreshArray(self.possibleMatches, possibleMatches);

      }, function(errResponse) {
        console.error('Error while fetching possible match list: ' + errResponse);
      });

      self.posterStyle = function(match) {
        if (match === self.selectedMatch) {
          return {"border": "solid limegreen"};
        } else {
          return {"border": "solid gray"};
        }
      };

      self.selectMatch = function(match) {
        self.selectedMatch = match;
      };


      self.ok = function() {
        if (self.selectedMatch.tvdb_series_ext_id !== series.tvdb_match_id) {
          var changedFields = {
            tvdb_match_id: self.selectedMatch.tvdb_series_ext_id
          };
          EpisodeService.updateSeries(series.id, changedFields).then(function() {
            series.tvdb_match_id = self.selectedMatch.tvdb_series_ext_id;
            series.tvdb_series_title = self.selectedMatch.tvdb_series_title;
            series.poster = self.selectedMatch.poster;
            series.posterResolved = self.selectedMatch.posterResolved;
            series.imageDoesNotExist = false;
          });
        }
        $uibModalInstance.close();
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);
