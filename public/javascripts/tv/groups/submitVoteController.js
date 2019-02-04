angular.module('mediaMogulApp')
.controller('submitVoteController', ['$log', 'LockService', '$http', '$uibModalInstance',
            'tv_group_ballot', 'series', 'tv_group', 'DateService', 'ArrayService',
  function($log, LockService, $http, $uibModalInstance, tv_group_ballot, series, tv_group, DateService, ArrayService) {
    const self = this;
    self.LockService = LockService;
    self.DateService = DateService;
    self.series = series;
    self.tv_group_ballot = tv_group_ballot;

    self.selectedVote = null;

    function getFormattedDate(date) {
      return self.DateService.getFormattedDate(date);
    }

    self.getOpenDate = function() {
      return getFormattedDate(self.tv_group_ballot.voting_open);
    };

    self.canSubmit = function() {
      return ArrayService.exists(self.selectedVote);
    };

    self.submitVote = function() {
      const payload = {
        tv_group_ballot_id: tv_group_ballot.id,
        vote_value: self.selectedVote,
        person_id: self.LockService.person_id
      };

      $http.post('/api/votes', {vote: payload}).then(function(result) {
        if (!_.isArray(tv_group_ballot.votes)) {
          tv_group_ballot.votes = [];
        }
        tv_group_ballot.votes.push({
          vote_value: payload.vote_value,
          person_id: payload.person_id
        });
        series.group_score = result.data.group_score;

        maybeCloseBallot().then(function() {
          $uibModalInstance.close();
        });
      });
    };

    function maybeCloseBallot() {
      if (tv_group.members.length === tv_group_ballot.votes.length) {
        const changedFields = {
          voting_closed: new Date
        };
        return $http.patch('api/ballots', { changedFields: changedFields, tv_group_ballot_id: tv_group_ballot.id});
      } else {
        return new Promise(function(resolve) {
          resolve();
        });
      }
    }

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);