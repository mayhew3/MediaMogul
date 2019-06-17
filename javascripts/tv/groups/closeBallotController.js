angular.module('mediaMogulApp')
.controller('closeBallotController', ['$log', 'LockService', '$http', '$uibModalInstance',
            'tv_group_ballot', 'series', 'DateService', 'tv_group', 'BallotService', 'SocketService',
  function($log, LockService, $http, $uibModalInstance, tv_group_ballot, series, DateService, tv_group, BallotService,
           SocketService) {
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

    function sendCloseBallotMessage(tv_group_ballot, skip) {
      const msgPayload = {
        series_id: self.series.id,
        tv_group_id: self.tv_group.id,
        voting_closed: tv_group_ballot.voting_closed,
        tv_group_ballot_id: tv_group_ballot.id,
        skip: skip
      };
      SocketService.emit('close_ballot', msgPayload);
    }

    self.closeBallot = function() {
      const skip = false;
      BallotService.closeBallot(tv_group_ballot, skip).then(() => {
        sendCloseBallotMessage(tv_group_ballot, skip);
        $uibModalInstance.close()
      });
    };

    self.skipBallot = function() {
      const skip = true;
      BallotService.closeBallot(tv_group_ballot, skip).then(() => {
        sendCloseBallotMessage(tv_group_ballot, skip);
        $uibModalInstance.close()
      });
    };

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
