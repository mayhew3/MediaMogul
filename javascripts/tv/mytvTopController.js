angular.module('mediaMogulApp')
  .controller('mytvTopController', ['LockService', 'NavHelperService', 'YearlyRatingService', '$state', '$stateParams',
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
          sref: 'shows'
        }
      ];

      self.GroupService.updateMyGroupsListIfDoesntExist().then((groups) => {
        _.each(groups, group => {
          const groupCategory = {
            label: group.name,
            subtitle: self.GroupService.getGroupMemberList(group),
            sref: 'groups.detail',
            group_id: group.id
          };

          self.categories.push(groupCategory);

        });

        initializeIncoming();
        self.groupsInitialized = true;
      });

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
        return [
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
          const sref = srefParts[1] + '.' + srefParts[2];
          return _.findWhere(self.categories, {sref: sref, group_id: groupId});
        } else {
          const sref = srefParts[1];
          return _.findWhere(self.categories, {sref: sref});
        }
      }

      function getSubCategoryFromState() {
        const srefParts = $state.current.name.split('.');
        const groupId = $stateParams.group_id;

        if (groupId) {
          return _.findWhere(self.subCategories, {sref: srefParts[3]});
        } else {
          return _.findWhere(self.subCategories, {sref: srefParts[2]});
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
        const currentSref = $state.current.name.split('.');

        if (currentSref[1] === 'shows') {
          if (currentSref.length < 3) {
            $state.go($state.current.name + '.dashboard');
          }
        } else if (currentSref[1] === 'groups') {
          if (currentSref.length < 4) {
            $state.go($state.current.name + '.dashboard');
          }
        } else {
          console.error('Unexpected 2nd sref part found: ' + $state.current.name + ". Expecting 'shows' or 'groups'");
        }
        return currentSref;
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

      self.addSeries = function() {
        $uibModal.open({
          templateUrl: 'views/tv/addSeries.html',
          controller: 'addSeriesController as ctrl',
          size: 'lg'
        });
      };

      self.open = function(series) {
        $uibModal.open({
          templateUrl: 'views/tv/seriesDetailPopup.html',
          controller: 'mySeriesDetailPopupController as ctrl',
          size: 'lg',
          resolve: {
            series: function() {
              return series;
            },
            owned: function() {
              return true;
            },
            adding: function() {
              return false;
            },
            addSeriesCallback: function() {
              return undefined;
            }
          }
        }).result.finally(function() {
          self.quickFindResult = undefined;
        });
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
