angular.module('mediaMogulApp')
.controller('addBallotController', ['$log', 'LockService', '$http', '$uibModalInstance', 'series',
            'DateService', 'ArrayService', 'groupSeries', 'starting_reason', 'EpisodeService', '$q', 'SocketService',
  function($log, LockService, $http, $uibModalInstance, series, DateService, ArrayService,
           groupSeries, starting_reason, EpisodeService, $q, SocketService) {
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

    self.skipBallot = function() {
      addBallotWithSkipValue(true);
    };

    self.addBallot = function() {
      addBallotWithSkipValue(false);
    };

    function addBallotWithSkipValue(skip) {
      maybeUpdateTrailer();

      const payload = {
        reason: self.reason,
        tv_group_series_id: self.groupSeries.tv_group_series_id,
        skip: skip
      };

      $http.post('/api/ballots', payload).then(function(result) {
        const submitDate = new Date;
        const ballot = {
          id: result.data[0].id,
          voting_open: submitDate,
          voting_closed: !skip ? null : submitDate,
          reason: self.reason,
          skip: skip,
          votes: []
        };
        if (!_.isArray(self.groupSeries.ballots)) {
          self.groupSeries.ballots = [ballot];
        } else {
          self.groupSeries.ballots.push(ballot);
        }

        SocketService.emit('add_ballot', ballot);

        $uibModalInstance.close();
      });
    }

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
