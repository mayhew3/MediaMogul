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

      self.subCategories = [
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

      self.selectedFilterInfo = self.categories[0];
      self.selectedSubCategory = self.subCategories[0];

      self.getSelectedCategory = function() {
        return self.selectedFilterInfo;
      };

      self.getSelectedSubCategory = function() {
        return self.selectedSubCategory;
      };

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

      function getSubCategory(sref) {
        return _.findWhere(self.subCategories, {sref: sref});
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
      }

      initializeIncoming();

      self.onCategoryChange = function(category) {
        if (category.sref === 'groups.detail') {
          $state.transitionTo('tv.' + category.sref + '.dashboard',
            {group_id: category.group_id},
            {
              reload: true,
              inherit: false,
              notify: true
            }
        );
        } else if (category.sref === 'shows') {
          $state.go('tv.' + category.sref + '.dashboard');
        } else {
          console.error('Unexpected category sref: ' + category.sref);
        }
        // initializeIncoming();
      };

      self.onSubCategoryChange = function(subCategory) {
        changeCurrentSubCategory(subCategory);
        $state.go('tv.shows.' + subCategory.sref);
      };

      function changeCurrentCategory(category) {
        self.selectedFilterInfo.label = category.label;
        self.selectedFilterInfo.sref = category.sref;
      }

      function changeCurrentSubCategory(subCategory) {
        self.selectedSubCategory.label = subCategory.label;
        self.selectedSubCategory.sref = subCategory.sref;
      }

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
          templateUrl: 'views/tv/seriesDetail.html',
          controller: 'mySeriesDetailController as ctrl',
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
