angular.module('mediaMogulApp')
.controller('addBallotController', ['$log', 'LockService', '$http', '$uibModalInstance', 'series',
            'DateService', 'ArrayService', 'groupSeries', 'starting_reason', 'EpisodeService', '$q',
  function($log, LockService, $http, $uibModalInstance, series, DateService, ArrayService,
           groupSeries, starting_reason, EpisodeService, $q) {
    const self = this;
    self.LockService = LockService;
    self.DateService = DateService;
    self.series = series;
    self.groupSeries = groupSeries;

    self.reason = !starting_reason ? 'To Start' : starting_reason;
    self.possibleReasons = [
      'To Start',
      'Post-Buffet',
      'New Season',
      'Absence Refresh'
    ];

    self.inputTrailer = null;

    self.needsTrailer = function() {
      return !self.series.trailer_link;
    };

    function maybeUpdateTrailer() {
      return $q(resolve => {
        if (!!self.inputTrailer) {
          const changedFields = {
            trailer_link: self.inputTrailer
          };
          EpisodeService.updateSeries(self.series.id, changedFields).then(() => {
            self.series.trailer_link = self.inputTrailer;
            resolve();
          });
        } else {
          resolve();
        }
      });
    }

    self.canSubmit = function() {
      return ArrayService.exists(self.reason);
    };

    self.addBallot = function() {
      maybeUpdateTrailer();

      const payload = {
        reason: self.reason,
        tv_group_series_id: self.groupSeries.tv_group_series_id
      };

      $http.post('/api/ballots', payload).then(function(result) {
        const ballot = {
          id: result.data[0].id,
          voting_open: new Date,
          voting_closed: null,
          reason: self.reason,
          skip: false,
          votes: []
        };
        if (!_.isArray(self.groupSeries.ballots)) {
          self.groupSeries.ballots = [ballot];
        } else {
          self.groupSeries.ballots.push(ballot);
        }
        $uibModalInstance.close();
      });
    };

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
