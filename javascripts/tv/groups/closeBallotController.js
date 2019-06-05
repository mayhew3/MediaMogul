angular.module('mediaMogulApp')
.controller('closeBallotController', ['$log', 'LockService', '$http', '$uibModalInstance',
            'tv_group_ballot', 'series', 'DateService', 'tv_group', 'BallotService',
  function($log, LockService, $http, $uibModalInstance, tv_group_ballot, series, DateService, tv_group, BallotService) {
    const self = this;
    self.LockService = LockService;
    self.DateService = DateService;
    self.series = series;
    self.tv_group = tv_group;
    self.tv_group_ballot = tv_group_ballot;

    self.selectedVote = null;
    self.showAllVotes = false;

    function getFormattedDate(date) {
      return self.DateService.getFormattedDate(date);
    }

    self.getOpenDate = function() {
      return getFormattedDate(self.tv_group_ballot.voting_open);
    };

    self.getTotalMembers = function() {
      return self.tv_group.members.length;
    };

    self.getRemainingVoteCount = function() {
      const votes = !self.tv_group_ballot.votes ? 0 : self.tv_group_ballot.votes.length;
      return self.getTotalMembers() - votes;
    };

    self.closeBallot = function() {
      BallotService.closeBallot(tv_group_ballot).then(() => $uibModalInstance.close());
    };

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
