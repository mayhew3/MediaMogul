angular.module('mediaMogulApp')
    .service('BallotService', ['$http', 'ArrayService', 'LockService', '$q', 'GroupService', '$uibModal',
      function ($http, ArrayService, LockService, $q, GroupService, $uibModal) {
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

        self.addBallotPopup = function(series, tv_group_id, starting_reason) {
          const groupSeries = GroupService.getGroupSeries(series, tv_group_id);
          $uibModal.open({
            templateUrl: 'views/tv/groups/addBallot.html',
            controller: 'addBallotController',
            controllerAs: 'ctrl',
            size: 'lg',
            resolve: {
              series: function() {
                return series;
              },
              groupSeries: function() {
                return groupSeries;
              },
              starting_reason: function() {
                return starting_reason;
              }
            }
          });
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
