angular.module('mediaMogulApp')
  .controller('showsController', ['LockService', 'NavHelperService', 'YearlyRatingService', '$state', '$stateParams',
    'EpisodeService', '$uibModal', 'GroupService',
    function (LockService, NavHelperService, YearlyRatingService, $state, $stateParams, EpisodeService, $uibModal,
              GroupService) {
      const self = this;

      self.LockService = LockService;
      self.EpisodeService = EpisodeService;
      self.GroupService = GroupService;
      self.year = 2017;

      self.incomingParam = $stateParams.group_id;
      self.quickFindResult = undefined;

      self.groupsInitialized = false;

      self.categories = [
        {
          label: 'My Shows',
          sref: 'shows.my'
        }
      ];

      function initializeGroups(groups) {
        _.each(groups, group => {
          const groupCategory = {
            label: group.name,
            subtitle: self.GroupService.getGroupMemberList(group),
            sref: 'shows.groups.detail',
            group_id: group.id
          };

          self.categories.push(groupCategory);
        });

        initializeIncoming();
        self.groupsInitialized = true;
      }
      GroupService.addCallback(initializeGroups);

      self.subCategories = getMyShowsSubCategories();

      self.selectedFilterInfo = self.categories[0];
      self.selectedSubCategory = self.subCategories[0];

      self.getSelectedCategory = function() {
        return self.selectedFilterInfo;
      };

      self.getSelectedSubCategory = function() {
        return self.selectedSubCategory;
      };

      function getMyShowsSubCategories() {
        const forEveryone = [
          {
            label: 'Dashboard',
            sref: 'dashboard'
          },
          {
            label: 'All Active',
            sref: 'allShows'
          },
          {
            label: 'Backlog',
            sref: 'backlog'
          }
        ];
        if (LockService.isAdmin()) {
          forEveryone.push({
            label: 'Rate',
            sref: 'rate'
          });
        }
        return forEveryone;
      }

      function getGroupShowsSubCategories() {
        return [
          {
            label: 'Dashboard',
            sref: 'dashboard'
          },
          {
            label: 'All Active',
            sref: 'allShows'
          }
        ];
      }

      function getCategoryFromState() {
        const srefParts = $state.current.name.split('.');
        let groupId = $stateParams.group_id;

        if (groupId) {
          groupId = parseInt(groupId);
          const sref = srefParts[1] + '.' + srefParts[2] + '.' + srefParts[3];
          return _.findWhere(self.categories, {sref: sref, group_id: groupId});
        } else {
          const sref = srefParts[1] + '.' + srefParts[2];
          return _.findWhere(self.categories, {sref: sref});
        }
      }

      function getSubCategoryFromState() {
        const srefParts = $state.current.name.split('.');
        const groupId = $stateParams.group_id;

        if (groupId) {
          return _.findWhere(self.subCategories, {sref: srefParts[4]});
        } else {
          return _.findWhere(self.subCategories, {sref: srefParts[3]});
        }
      }


      function isInGroupMode() {
        return $state.current.name.includes('groups');
      }

      self.showDashboard = function() {
        return !isInGroupMode() || self.groupsInitialized;
      };

      self.getCategories = function() {
        return self.categories;
      };

      function appendDashboardIfNecessary() {
        const currentSref = getTrimmedSref();

        if (hasMatch(currentSref)) {
          $state.go($state.current.name + '.dashboard');
        }

        return $state.current.name.split('.');
      }

      function hasMatch(sref) {
        const match = _.findWhere(self.categories, {sref: sref});
        return match;
      }

      function getTrimmedSref() {
        const srefParts = $state.current.name.split('.');
        const withoutFirst = srefParts.splice(1);
        const srefWithoutFirst = withoutFirst.join('.');
        return srefWithoutFirst;
      }

      function initializeIncoming() {
        appendDashboardIfNecessary();

        const categoryFromState = getCategoryFromState();
        if (categoryFromState) {
          self.selectedFilterInfo = categoryFromState;
          self.selectedSubCategory = getSubCategoryFromState();
        }

        if (isInGroupMode()) {
          self.subCategories = getGroupShowsSubCategories();
        } else {
          self.subCategories = getMyShowsSubCategories();
        }
      }

      initializeIncoming();

      self.onCategoryChange = function(category) {
        navigateTo(category.sref, 'dashboard', category.group_id);
      };

      function getViewerObj() {
        const viewerObj = {
          type: isInGroupMode() ? 'group' : 'my',
          group_id: isInGroupMode() ? self.selectedFilterInfo.group_id : null
        };
        return viewerObj;
      }

      function navigateTo(sref, subSref, groupId) {
        const groupObj = groupId ? {group_id: groupId} : {};
        $state.transitionTo('tv.' + sref + '.' + subSref,
          groupObj,
          {
            reload: true,
            inherit: false,
            notify: true
          }
        );
      }

      self.onSubCategoryChange = function(subCategory) {
        const category = self.getSelectedCategory();
        navigateTo(category.sref, subCategory.sref, category.group_id);
      };

      NavHelperService.changeSelectedNav('TV');

      if (LockService.isAdmin()) {
        YearlyRatingService.updateNumberOfShowsToRate(self.year);
      }

      self.getNumberOfShowsToRate = function() {
        return YearlyRatingService.getNumberOfShowsToRate();
      };

      self.handleQuickFind = function(series) {
        if (!!series.fakeCatchAll) {
          $state.go('tv.addShows.search.initial', {initial_search: series.inputValue});
        } else {
          self.goTo(series);
        }
      };

      self.goTo = function(series) {
        $state.transitionTo('tv.show',
          {
            series_id: series.id,
            viewer: getViewerObj(),
            from_sref: $state.current.name,
            from_params: $stateParams
          },
          {
            reload: true,
            inherit: false,
            notify: true
          }
        );
      };

      self.getQuickFindShows = function() {
        const catchAll = [{
          title: '(Search for more....)',
          fakeCatchAll: true
        }];
        return self.EpisodeService.getAllShows().concat(catchAll);
      };

      self.addSeries = function() {
        $state.go('tv.addShows.search');
      };

      self.createGroup = function() {
        $uibModal.open({
          templateUrl: 'views/tv/groups/createGroup.html',
          controller: 'createGroupController',
          controllerAs: 'ctrl',
          size: 'lg'
        });
      };

    }

  ]);
