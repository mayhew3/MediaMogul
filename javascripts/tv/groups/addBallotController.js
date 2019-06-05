angular.module('mediaMogulApp')
.controller('addBallotController', ['$log', 'LockService', '$http', '$uibModalInstance',
            'series', 'DateService', 'ArrayService', 'groupSeries', 'starting_reason',
  function($log, LockService, $http, $uibModalInstance, series, DateService, ArrayService,
           groupSeries, starting_reason) {
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

    self.canSubmit = function() {
      return ArrayService.exists(self.reason);
    };

    self.addBallot = function() {
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
