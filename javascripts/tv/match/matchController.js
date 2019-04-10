angular.module('mediaMogulApp')
  .controller('matchController', ['$log', '$http', '$uibModal', 'EpisodeService', 'LockService', 'ArrayService', 'SeriesMatchingService',
    function($log, $http, $uibModal, EpisodeService, LockService, ArrayService, SeriesMatchingService) {
      const self = this;

      self.series = [];

      self.LockService = LockService;

      self.selectedPill = "Series";

      self.isActive = function(pillName) {
        return (pillName === self.selectedPill) ? "active" : null;
      };

      self.clearTempFlags = function() {
        self.series.forEach(function (series) {
          delete series.temp_confirmed;
          delete series.temp_ignored;
        })
      };

      self.changeSelectedPill = function(pillName) {
        self.selectedPill = pillName;
        self.clearTempFlags();
      };

      self.changeToSeries = function() {
        self.changeSelectedPill('Series');
      };

      self.statusFilter = function(series, status) {
        return series.tvdb_match_status === status || series.previous_status === status;
      };

      self.matchFirstPassFilter = function(series) {
        return self.statusFilter(series, 'Match First Pass');
      };

      self.needsConfirmationFilter = function(series) {
        return self.statusFilter(series, 'Needs Confirmation');
      };

      self.duplicateFilter = function(series) {
        return self.statusFilter(series, 'Duplicate');
      };

      self.needsHintFilter = function(series) {
        return self.statusFilter(series, 'Needs Hint');
      };

      self.getSeriesNameClass = function(series) {
        if (series.temp_ignored) {
          return "ignored";
        }
        if (series.temp_confirmed) {
          return "confirmed";
        }
        return "";
      };

      self.refreshSeriesList = function() {
        return $http.get('/seriesMatchList').then(function (showResponse) {
          $log.debug("Shows returned " + showResponse.data.length + " items.");
          let tempShows = showResponse.data;
          tempShows.forEach(function (show) {
            EpisodeService.updatePosterLocation(show);
          });
          $log.debug("Finished updating.");
          ArrayService.refreshArray(self.series, tempShows);

          $log.debug("Controller has " + self.series.length + " shows.");
        }, function (errResponse) {
          console.error('Error while fetching series list: ' + errResponse);
        });

      };
      self.refreshSeriesList();

      self.ignoreSeries = function(series) {
        var changedFields = {
          tvdb_ignore_date: new Date,
          tvdb_match_status: 'Ignored'
        };
        EpisodeService.updateSeries(series.id, changedFields).then(function () {
          series.temp_ignored = true;
          series.previous_status = series.tvdb_match_status;
          series.tvdb_match_status = 'Ignored';
          SeriesMatchingService.decrementPendingMatches();
        });
      };

      self.unIgnoreSeries = function(series) {
        var changedFields = {
          tvdb_ignore_date: null,
          tvdb_match_status: series.previous_status
        };
        EpisodeService.updateSeries(series.id, changedFields).then(function () {
          series.temp_ignored = false;
          series.tvdb_match_status = series.previous_status;
          series.previous_status = null;
          SeriesMatchingService.incrementPendingMatches();
        });
      };

      self.confirmMatch = function(series) {
        var changedFields = {
          tvdb_confirm_date: new Date,
          tvdb_match_status: 'Match Confirmed'
        };
        EpisodeService.updateSeries(series.id, changedFields).then(function () {
          series.temp_confirmed = true;
          series.previous_status = series.tvdb_match_status;
          series.tvdb_match_status = 'Match Confirmed';
          SeriesMatchingService.decrementPendingMatches();
        });
      };

      self.unConfirmMatch = function(series) {
        var changedFields = {
          tvdb_confirm_date: null,
          tvdb_match_status: series.previous_status
        };
        EpisodeService.updateSeries(series.id, changedFields).then(function () {
          series.temp_confirmed = false;
          series.tvdb_match_status = series.previous_status;
          series.previous_status = null;
          SeriesMatchingService.incrementPendingMatches();
        });
      };

      self.open = function(series) {
        $uibModal.open({
          templateUrl: 'views/tv/match/matchConfirmation.html',
          controller: 'matchConfirmationController as ctrl',
          size: 'lg',
          resolve: {
            series: function() {
              return series;
            }
          }
        });
      };

    }
  ]);
