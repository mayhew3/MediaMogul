angular.module('mediaMogulApp')
    .service('BallotService', ['$http', 'ArrayService', 'LockService', '$q', 'GroupService', '$uibModal', '$filter',
      function ($http, ArrayService, LockService, $q, GroupService, $uibModal, $filter) {
        const self = this;

        self.LockService = LockService;

        self.getMostRecentClosedBallot = function(groupSeries) {
          const ordered = $filter('orderBy')(groupSeries.ballots, 'voting_closed', true);
          return _.find(ordered, ballot => !!ballot.voting_closed && !ballot.skip);
        };

        self.getMostRecentClosedOrSkippedBallot = function(groupSeries) {
          const ordered = $filter('orderBy')(groupSeries.ballots, 'voting_closed', true);
          return _.find(ordered, ballot => !!ballot.voting_closed);
        };

        self.getLastVoteDate = function(groupSeries) {
          const voteDates = _.map(groupSeries.ballots, ballot => !ballot.voting_closed ? null : new Date(ballot.voting_closed));
          const reduced = _.compact(voteDates);
          const maximum = _.max(reduced);
          return !maximum ? null : maximum;
        };

        self.getLastVoteOrSkipDate = function(groupSeries) {
          const lastBallot = self.getMostRecentClosedOrSkippedBallot(groupSeries);
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

        self.closeBallot = function(ballot, skip) {
          return $q((resolve, reject) => {
            const changedFields = {
              voting_closed: new Date,
              skip: skip
            };
            $http.patch('api/ballots', {
              changedFields: changedFields,
              tv_group_ballot_id: ballot.id
            }).then(() => {
              ballot.voting_closed = new Date;
              ballot.skip = skip;
              resolve();
            }).catch(err => reject(err));
          });
        };

      }]);
