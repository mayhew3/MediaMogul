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
          if (!!groupSeries && _.isArray(groupSeries.ballots)) {
            const ballot = _.findWhere(groupSeries.ballots, {id: msg.tv_group_ballot_id});
            if (!!ballot && !ballot.voting_closed) {
              GroupService.addVoteToBallot(msg, ballot);
            }
          }
        }

        function addBallotMessageReceived(msg) {
          const series = EpisodeService.findSeriesWithId(msg.series_id);
          const groupSeries = GroupService.getGroupSeries(series, msg.tv_group_id);
          if (!!msg.trailer_link) {
            series.trailer_link = msg.trailer_link;
          }
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
