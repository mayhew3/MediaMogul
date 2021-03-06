angular.module('mediaMogulApp')
.controller('submitVoteController', ['$log', 'LockService', '$http', '$uibModalInstance',
            'tv_group_ballot', 'series', 'tv_group', 'DateService', 'ArrayService', 'GroupService',
            'SeriesDetailService', '$q', 'BallotService', 'SocketService', 'EpisodeService',
  function($log, LockService, $http, $uibModalInstance, tv_group_ballot, series, tv_group, DateService,
           ArrayService, GroupService, SeriesDetailService, $q, BallotService, SocketService, EpisodeService) {
    const self = this;
    self.LockService = LockService;
    self.GroupService = GroupService;
    self.DateService = DateService;
    self.series = series;
    self.groupSeries = GroupService.getGroupSeries(series, tv_group.id);
    self.tv_group_ballot = tv_group_ballot;

    self.selectedVote = null;
    self.showAllVotes = false;
    let loading = true;

    startDetailUpdate();

    function getFormattedDate(date) {
      return self.DateService.getFormattedDate(date);
    }

    function startDetailUpdate() {
      return $q(resolve => {
        SeriesDetailService.getSeriesDetailInfo(self.series.id, EpisodeService.getSeriesDetailInfo).then(function (results) {
          resolve();

          mergeNewGroupsOntoSeries(results.series);

          self.voteInfos = getVoteInfos();

          loading = false;
          self.detailReady = true;
        });
      });
    }

    self.isLoading = function() {
      return !!loading;
    };

    self.reasonLabel = function() {
      const reason = tv_group_ballot.reason;
      return reason === 'New Season' ?
        'New Season (' + self.groupSeries.nextEpisodeSeason + ')' :
        reason;
    };

    self.showNextSeasonAndEpisode = function() {
      return !!self.groupSeries.nextEpisodeSeason && !!self.groupSeries.nextEpisodeNumber;
    };

    self.nextEpisodeString = function() {
      return 'Season ' + self.groupSeries.nextEpisodeSeason + ' Episode ' + self.groupSeries.nextEpisodeNumber;
    };

    function mergeNewGroupsOntoSeries(incomingSeries) {
      _.each(incomingSeries.groups, group => {
        const existing = _.findWhere(self.series.groups, {tv_group_id: group.tv_group_id});
        if (!existing) {
          self.series.groups.push(group);
        }
      });
    }

    function transformToDisplayableVote(vote, tv_group_id) {
      return {
        vote_value: vote.vote_value,
        voter: isMe(vote.person_id) ? 'You' : GroupService.getMemberName(tv_group_id, vote.person_id),
        vote_date: vote.date_added
      }
    }

    self.getVoteTextClass = function(vote) {
      if (vote.voter === 'You') {
        return 'youText';
      } else {
        return '';
      }
    };

    self.getVoteBoxClass = function(vote) {
      if (vote.voter === 'You') {
        return 'myVote';
      } else {
        return '';
      }
    };

    function isMe(person_id) {
      return self.LockService.getPersonID() === person_id;
    }

    self.displayAsTimeAgo = function(dateValue) {
      return !!dateValue ? moment(dateValue).fromNow() : '';
    };

    function getVoteInfos() {
      const voteInfos = [];

      _.each(self.series.groups, group => {
        const pastBallots = _.filter(group.ballots, ballot => !!ballot.voting_closed && !ballot.skip);

        if (pastBallots.length > 0) {

          const fullGroupInfo = GroupService.getGroupWithID(group.tv_group_id);

          if (group.tv_group_id === tv_group.id) {
            const ballotObjs = _.map(pastBallots, ballot => {
              const voteObjs = _.map(ballot.votes, vote => transformToDisplayableVote(vote, group.tv_group_id));
              return {
                voting_closed: ballot.voting_closed,
                reason: ballot.reason,
                votes: voteObjs
              }
            });
            voteInfos.push({
              group_id: group.tv_group_id,
              groupName: fullGroupInfo.name + ' (This Group)',
              ballots: ballotObjs
            });
          } else {
            const filteredBallots = _.map(pastBallots, ballot => {
              const myVote = _.find(ballot.votes, vote => isMe(vote.person_id));
              return !myVote ? null : {
                voting_closed: ballot.voting_closed,
                reason: ballot.reason,
                votes: [transformToDisplayableVote(myVote, group.tv_group_id)]
              };
            });
            const compacted = _.compact(filteredBallots);
            if (compacted.length > 0) {
              voteInfos.push({
                group_id: group.tv_group_id,
                groupName: fullGroupInfo.name,
                ballots: compacted
              });
            }
          }
        }
      });

      if (voteInfos.length > 0) {
        const firstGroup = voteInfos[0];
        firstGroup.alwaysShow = true;
        if (firstGroup.ballots.length > 0) {
          firstGroup.ballots[0].alwaysShow = true;
        }
      }

      return voteInfos;
    }

    self.showGroupOrBallot = function(groupOrBallot) {
      return self.showAllVotes || !!groupOrBallot.alwaysShow;
    };

    self.showPersonalRating = function() {
      return !!self.series.personSeries && !!self.series.personSeries.my_rating;
    };

    self.showPreviousVotesSection = function() {
      return !self.isLoading() && !!self.voteInfos && self.voteInfos.length > 0;
    };

    function getBallotCount() {
      const ballots = [];
      _.each(self.voteInfos, voteInfo => ArrayService.addToArray(ballots, voteInfo.ballots));
      return ballots.length;
    }

    self.shouldShowToggle = function() {
      return getBallotCount() > 1;
    };

    self.getShowAllToggleText = function() {
      return self.showAllVotes ? '(show one)' : '(show all)';
    };

    self.toggleShowAll = function() {
      self.showAllVotes = !self.showAllVotes;
    };

    self.getOpenDate = function() {
      return getFormattedDate(self.tv_group_ballot.voting_open);
    };

    self.getOpenedBy = function() {
      const personId = self.tv_group_ballot.person_id;
      if (!personId) {
        return '<unknown>';
      } else {
        return self.GroupService.getMemberName(tv_group.id, personId);
      }
    };

    self.canSubmit = function() {
      return ArrayService.exists(self.selectedVote);
    };

    self.submitVote = function() {
      const vote = {
        tv_group_ballot_id: tv_group_ballot.id,
        vote_value: self.selectedVote,
        person_id: self.LockService.getPersonID()
      };

      const body = {
        vote: vote,
        tv_group_id: tv_group.id,
        series_id: self.series.id
      };
      $http.post('/api/votes', body).then(function(result) {

        GroupService.updateVotesForBallot(result.data.votes, tv_group_ballot);

        self.groupSeries.group_score = result.data.group_score;

        $uibModalInstance.close();
      });
    };

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
