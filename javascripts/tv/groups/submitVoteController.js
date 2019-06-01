angular.module('mediaMogulApp')
.controller('submitVoteController', ['$log', 'LockService', '$http', '$uibModalInstance',
            'tv_group_ballot', 'series', 'tv_group', 'DateService', 'ArrayService', 'GroupService',
            'SeriesDetailService', '$q',
  function($log, LockService, $http, $uibModalInstance, tv_group_ballot, series, tv_group, DateService,
           ArrayService, GroupService, SeriesDetailService, $q) {
    const self = this;
    self.LockService = LockService;
    self.DateService = DateService;
    self.series = series;
    self.groupSeries = GroupService.getGroupSeries(series, tv_group.id);
    self.tv_group_ballot = tv_group_ballot;

    self.selectedVote = null;
    let loading = true;

    startDetailUpdate();

    function getFormattedDate(date) {
      return self.DateService.getFormattedDate(date);
    }

    function startDetailUpdate() {
      return $q(resolve => {
        SeriesDetailService.getSeriesDetailInfo(self.series.id).then(function (results) {
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

    function isMe(person_id) {
      return self.LockService.person_id === person_id;
    }

    self.displayAsTimeAgo = function(dateValue) {
      return !!dateValue ? moment(dateValue).fromNow() : '';
    };

    function getVoteInfos() {
      const voteInfos = [];

      _.each(self.series.groups, group => {
        const pastBallots = _.filter(group.ballots, ballot => !!ballot.voting_closed);

        if (pastBallots.length > 0) {

          const fullGroupInfo = GroupService.getGroupWithID(group.tv_group_id);

          if (group.tv_group_id === tv_group.id) {
            const ballotObjs = _.map(pastBallots, ballot => {
              const voteObjs = _.map(ballot.votes, vote => transformToDisplayableVote(vote, group.tv_group_id));
              return {
                voting_closed: ballot.voting_closed,
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
              const myVote = _.findWhere(ballot.votes, vote => isMe(vote.person_id));
              return !myVote ? null : {
                voting_closed: ballot.voting_closed,
                votes: [transformToDisplayableVote(myVote, group.tv_group_id)]
              };
            });
            const compacted = _.compact(filteredBallots);
            voteInfos.push({
              group_id: group.tv_group_id,
              groupName: fullGroupInfo.name,
              ballots: compacted
            });
          }
        }
      });

      return voteInfos;
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
        self.groupSeries.group_score = result.data.group_score;

        maybeCloseBallot().then(function() {
          $uibModalInstance.close();
        });
      });
    };

    function maybeCloseBallot() {
      return new Promise(resolve => {
        if (tv_group.members.length === tv_group_ballot.votes.length) {
          const changedFields = {
            voting_closed: new Date
          };
          $http.patch('api/ballots', {
            changedFields: changedFields,
            tv_group_ballot_id: tv_group_ballot.id
          }).then(() => {
            tv_group_ballot.voting_closed = new Date;
            resolve();
          });
        } else {
          resolve();
        }
      });
    }

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
