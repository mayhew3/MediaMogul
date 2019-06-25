angular.module('mediaMogulApp')
    .service('GroupMessageService', ['$http', 'SocketService', 'EpisodeService', 'GroupService',
      function ($http, SocketService, EpisodeService, GroupService) {

        // Socket Message Handler

        SocketService.on('vote_submitted', handleVoteSubmittedMessage);
        SocketService.on('add_ballot', addBallotMessageReceived);
        SocketService.on('close_ballot', closeBallotMessageReceived);

        function handleVoteSubmittedMessage(msg) {
          const series = EpisodeService.findSeriesWithId(msg.series_id);
          const groupSeries = GroupService.getGroupSeries(series, msg.tv_group_id);
          const tv_group = GroupService.getGroupWithID(msg.tv_group_id);
          if (!!groupSeries && _.isArray(groupSeries.ballots)) {
            const ballot = _.findWhere(groupSeries.ballots, {id: msg.tv_group_ballot_id});
            if (!!ballot && !ballot.voting_closed) {
              GroupService.addVoteToBallot(msg, ballot);
            }
            if (tv_group.members.length === ballot.votes.length) {
              ballot.voting_closed = new Date;
              groupSeries.group_score = msg.group_score;
            }
          }
        }

        function addBallotMessageReceived(msg) {
          const series = EpisodeService.findSeriesWithId(msg.series_id);
          const groupSeries = GroupService.getGroupSeries(series, msg.tv_group_id);
          GroupService.addBallotToGroupSeries(msg.ballot, groupSeries);
        }

        function closeBallotMessageReceived(msg) {
          const series = EpisodeService.findSeriesWithId(msg.series_id);
          const groupSeries = GroupService.getGroupSeries(series, msg.tv_group_id);
          const ballot = _.findWhere(groupSeries.ballots, {id: msg.tv_group_ballot_id});
          if (!!ballot) {
            ballot.voting_closed = msg.voting_closed;
            ballot.skip = msg.skip;
          }
        }

      }]);
