angular.module('mediaMogulApp')
.controller('submitVoteController', ['$log', 'LockService', '$http', '$uibModalInstance', 'tv_group_ballot', 'series',
  function($log, LockService, $http, $uibModalInstance, tv_group_ballot, series) {
    const self = this;
    self.LockService = LockService;
    self.series = series;

    self.selectedVote = 1;
    self.possibleVotes = [1,2,3,4,5,6];

    self.getVoteButtonClass = function(vote) {
      return self.selectedVote === vote ? "btn btn-success" : "btn btn-primary";
    };

    self.submitVote = function() {
      const payload = {
        tv_group_ballot_id: tv_group_ballot.id,
        vote_value: self.selectedVote,
        person_id: self.LockService.person_id
      };

      $http.post('/api/votes', {vote: payload}).then(function() {
        $uibModalInstance.close();
      });
    };

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };
  }
]);