angular.module('mediaMogulApp')
  .controller('mytvTopController', ['LockService', 'NavHelperService', 'YearlyRatingService', '$state', '$stateParams',
    'EpisodeService', '$uibModal',
    function (LockService, NavHelperService, YearlyRatingService, $state, $stateParams, EpisodeService, $uibModal) {
      const self = this;

      self.LockService = LockService;
      self.EpisodeService = EpisodeService;
      self.year = 2017;

      self.incomingParam = $stateParams.group_id;
      self.quickFindResult = undefined;

      self.categories = [
        {
          label: 'My Shows',
          sref: 'shows'
        }
      ];

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

      self.selectedFilterInfo = {
        label: 'My Shows',
        sref: 'shows'
      };

      self.selectedSubCategory = {
        label: 'Dashboard',
        sref: 'dashboard'
      };

      function getCategory(sref) {
        return _.findWhere(self.categories, {sref: sref});
      }

      function getSubCategory(sref) {
        return _.findWhere(self.subCategories, {sref: sref});
      }


      function initializeIncoming() {
        const currentSref = $state.current.name.split('.');

        const selectedCat = getCategory(currentSref[1]);
        changeCurrentCategory(selectedCat);

        const selectedSubCat = getSubCategory(currentSref[2]);
        changeCurrentSubCategory(selectedSubCat);
      }

      initializeIncoming();

      self.onCategoryChange = function(category) {
        changeCurrentCategory(category);
        $state.go('tv.' + category.sref);
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

    }

  ]);
