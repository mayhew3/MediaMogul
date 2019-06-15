angular.module('mediaMogulApp')
    .service('GroupService', ['$http', 'ArrayService', 'LockService', '$q', 'SocketService', '$injector',
      function ($http, ArrayService, LockService, $q, SocketService, $injector) {
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
            $http.get('/api/myGroups', {params: {person_id: LockService.person_id}}).then(function(results) {
              self.loadingGroups = false;

              ArrayService.refreshArray(groups, results.data);
              resolve(groups);

            }).catch(err => {
              console.error('Error while fetching groups list: ' + err);
              reject();
            });
          });

        };

        SocketService.on('vote_submitted', msg => {
          const series = getEpisodeService().findSeriesWithId(msg.series_id);
          const groupSeries = self.getGroupSeries(series, msg.tv_group_id);
          const tv_group = self.getGroupWithID(msg.tv_group_id);
          if (_.isArray(groupSeries.ballots)) {
            const ballot = _.findWhere(groupSeries.ballots, {id: msg.tv_group_ballot_id});
            if (!!ballot && !ballot.voting_closed) {
              self.addVoteToBallot(msg, ballot);
            }
            if (tv_group.members.length === ballot.votes.length) {
              ballot.voting_closed = new Date;
              groupSeries.group_score = msg.group_score;
            }
          }
        });

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

        function getEpisodeService() {
          return $injector.get('EpisodeService');
        }

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
            return member.person_id !== self.LockService.person_id;
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
            person_id: self.LockService.person_id,
            client_id: SocketService.getClientID()
          });
        };

      }]);
