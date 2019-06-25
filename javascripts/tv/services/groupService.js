angular.module('mediaMogulApp')
    .service('GroupService', ['$http', 'ArrayService', 'LockService', '$q', 'SocketService',
      function ($http, ArrayService, LockService, $q, SocketService) {
        const self = this;

        self.LockService = LockService;

        const groups = [];

        self.uninitialized = true;
        self.loadingGroups = true;
        self.errorGroups = false;

        self.updateMyGroupsList = function() {
          self.uninitialized = false;
          self.loadingGroups = true;
          self.errorGroups = false;

          return $q((resolve, reject) => {
            $http.get('/api/myGroups', {params: {person_id: LockService.getPersonID()}}).then(function(results) {
              self.loadingGroups = false;

              ArrayService.refreshArray(groups, results.data);
              resolve(groups);

            }).catch(err => {
              console.error('Error while fetching groups list: ' + err);
              reject();
            });
          });

        };

        self.addBallotToGroupSeries = function(ballot, groupSeries) {
          if (!_.isArray(groupSeries.ballots)) {
            groupSeries.ballots = [ballot];
          } else {
            groupSeries.ballots.push(ballot);
          }
        };

        self.addVoteToBallot = function(vote, ballot) {
          if (!_.isArray(ballot.votes)) {
            ballot.votes = [];
          }
          ballot.votes.push({
            vote_value: vote.vote_value,
            person_id: vote.person_id
          });
        };

        self.updateMyGroupsListIfDoesntExist = function() {
          return $q(resolve => {
            if (self.uninitialized) {
              self.updateMyGroupsList().then((groups) => resolve(groups));
            } else {
              resolve(groups);
            }
          });
        };

        self.isInMyGroups = function(tv_group_id) {
          const existing = _.findWhere(groups, {id: tv_group_id});
          return !!existing;
        };

        self.getMyGroups = function() {
          return groups;
        };

        self.addToMyGroups = function(group) {
          const matching = self.getGroupWithID(group.id);
          if (!matching) {
            groups.push(group);
          }
        };

        self.groupHasSeries = function(series, tv_group_id) {
          return ArrayService.exists(self.getGroupSeries(series, tv_group_id));
        };

        self.getGroupSeries = function(series, tv_group_id) {
          return _.findWhere(series.groups, {tv_group_id: tv_group_id});
        };

        self.removeGroupFromSeries = function(series, tv_group_id) {
          const groups = series.groups;
          if (!!groups) {
            const matching = _.findWhere(groups, {tv_group_id: tv_group_id});
            if (!!matching) {
              ArrayService.removeFromArray(groups, matching);
            }
          }
        };

        self.getGroupEpisode = function(episode, tv_group_id) {
          return episode.groups ?
            _.findWhere(episode.groups, {tv_group_id: tv_group_id}) :
            undefined;
        };

        self.getGroupMemberList = function(group) {
          const membersWithoutMe = _.filter(group.members, function(member) {
            return member.person_id !== self.LockService.getPersonID();
          });
          const memberNames = _.pluck(membersWithoutMe, 'first_name');
          return memberNames.join(', ');
        };

        self.getGroupWithID = function(tv_group_id) {
          return _.findWhere(groups, {id: tv_group_id});
        };

        self.getMemberIDs = function(tv_group_id) {
          const group = self.getGroupWithID(tv_group_id);
          return _.pluck(group.members, 'person_id');
        };

        self.getMemberName = function(tv_group_id, person_id) {
          const group = self.getGroupWithID(tv_group_id);
          const member = _.findWhere(group.members, {person_id: person_id});
          return member.first_name;
        };

        self.markPastGroupEpisodesWatched = function(series_id, tv_group_id, lastWatched, watched) {
          return $http.post('/api/watchPastGroupEpisodes', {
            series_id: series_id,
            last_watched: lastWatched,
            tv_group_id: tv_group_id,
            watched: watched,
            skipped: !watched,
            person_ids: self.getMemberIDs(tv_group_id),
            person_id: self.LockService.getPersonID(),
            client_id: SocketService.getClientID()
          });
        };

      }]);
