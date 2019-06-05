angular.module('mediaMogulApp')
    .service('BallotService', ['$http', 'ArrayService', 'LockService', '$q',
      function ($http, ArrayService, LockService, $q) {
        const self = this;

        self.LockService = LockService;

        self.getMostRecentClosedBallot = function(groupSeries) {
          const ordered = sort.js(groupSeries.ballots).desc('voting_closed');
          return _.find(ordered, ballot => !!ballot.voting_closed);
        };

        self.getLastVoteDate = function(groupSeries) {
          const lastBallot = self.getMostRecentClosedBallot(groupSeries);
          return !lastBallot ? null : lastBallot.voting_closed;
        };

        self.closeBallot = function(ballot) {
          return $q((resolve, reject) => {
            const changedFields = {
              voting_closed: new Date
            };
            $http.patch('api/ballots', {
              changedFields: changedFields,
              tv_group_ballot_id: ballot.id
            }).then(() => {
              ballot.voting_closed = new Date;
              resolve();
            }).catch(err => reject(err));
          });
        };

      }]);
