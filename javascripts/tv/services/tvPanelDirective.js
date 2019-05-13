(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('tvPanel', tvPanel);

  function tvPanel() {
    return {
      templateUrl: 'views/tv/tvPanel.html',
      controller: ['$scope', 'ArrayService', 'EpisodeService', 'GroupService', tvPanelController],
      controllerAs: 'ctrl',
      scope: {
        shows: '=',
        panelInfo: '=',
        onClick: '='
      }
    }
  }

  function tvPanelController($scope, ArrayService, EpisodeService, GroupService) {
    const self = this;

    self.EpisodeService = EpisodeService;

    self.shows = $scope.shows;
    self.onClick = $scope.onClick;

    self.panelInfo = $scope.panelInfo;
    self.ArrayService = ArrayService;

    self.showLoading = self.panelInfo.showLoading ? self.panelInfo.showLoading : () => false;
    self.showError = self.panelInfo.showError ? self.panelInfo.showError : () => false;

    self.currentPageUpNext = 1;

    self.titleSearch = undefined;

    self.showFilterBar = false;
    self.filtersReady = false;

    self.filters = self.panelInfo.filters;
    cachePossibleValues();

    self.pageSize = ArrayService.exists(self.panelInfo.pageLimit) ? self.panelInfo.pageLimit : 1000;

    if (!$scope.shows) {
      self.EpisodeService.registerAsObserver($scope);
    }

    self.toggleFilterBar = () => self.showFilterBar = !self.showFilterBar;

    self.showQuickFilter = function() {
      return !!self.panelInfo.showQuickFilter;
    };

    self.allFilter = function(show) {
      const filters = allFilters();
      return runThroughFilterArray(filters, show);
    };

    self.hasButtonInfo = function() {
      return ArrayService.exists(getButtonInfo());
    };

    self.getButtonLabel = function(show) {
      return self.hasButtonInfo() ? getButtonInfo().getLabel(show) : null;
    };

    self.getButtonClass = function(show) {
      return self.hasButtonInfo() ? getButtonInfo().getButtonClass(show) : null;
    };

    self.doButtonAction = function(show) {
      if (self.hasButtonInfo()) {
        getButtonInfo().onClick(show);
      }
    };

    self.showPanel = function() {
      return self.showLoading() ||
          self.showError() ||
          (self.showEmpty() && self.totalItems() === 0) ||
          self.totalItems() > 0;
    };

    self.getShows = function() {
      return self.shows ? self.shows : self.panelInfo.seriesFunction();
    };

    self.EpisodeService.registerDataPresentCallback({
      callback: refreshCachedLabels
    });

    self.toggleActive = function(filter, filterOption) {
      filterOption.isActive = !filterOption.isActive;
      if (!!filterOption.allSpecial) {
        checkAllRegularOptions(filter);
      } else if (!!filterOption.noneSpecial) {
        uncheckAllRegularOptions(filter);
      }
      updateAllSpecialDenorm(filter);
      updateNoneSpecialDenorm(filter);
      refreshCachedLabels();
    };

    self.imageColumnClass = function() {
      return (self.panelInfo.posterSize === 'small') ? 'col-xs-4 col-sm-2 col-md-2' : 'col-xs-6 col-sm-3 col-md-2';
    };

    self.totalItems = function() {
      return self.getShows().length === 0 ? 0 :
        self.getShows().filter(self.allFilter).length;
    };

    self.panelFormat = function() {
      return ArrayService.exists(self.panelInfo.panelFormat) ? self.panelInfo.panelFormat : 'panel-default';
    };

    self.orderBy = function() {
      return [nullsLast, getFieldOnly(), 'title'];
    };

    self.reverseSort = function() {
      return self.panelInfo.sort.direction === 'desc';
    };

    self.getGroupSeries = function(series) {
      return GroupService.getGroupSeries(series, self.group.id);
    };

    self.reverseSort = function() {
      return self.panelInfo.sort.direction === 'desc';
    };

    self.getGroupSeries = function(series) {
      return GroupService.getGroupSeries(series, self.group.id);
    };

    self.showEmpty = function() {
      return ArrayService.exists(self.panelInfo.showEmpty) ? self.panelInfo.showEmpty : false;
    };

    self.subtitle = function(show) {
      return ArrayService.exists(self.panelInfo.subtitle) ? self.panelInfo.subtitle(show) : null;
    };

    self.posterInfo = {
      clickOverride: self.panelInfo.clickOverride,
      badgeValue: self.panelInfo.badgeValue,
      extraStyles: self.panelInfo.extraStyles,
      textOverlay: self.panelInfo.textOverlay
    };

    // PRIVATE METHODS

    function getButtonInfo() {
      return self.panelInfo.buttonInfo;
    }

    function getFieldWithDirection() {
      return self.panelInfo.sort;
    }

    function getFieldOnly() {
      const sort = self.panelInfo.sort;
      return sort.field;
    }

    function allFilters() {
      const realFilters = getRealFilterBarFilters();
      ArrayService.addToArray(realFilters, getBaseFilters());
      return realFilters;
    }

    function allFiltersBut(filter) {
      const myAllFilters = getBaseFilters();
      const filtersToAdd = _.filter(self.filters, existingFilter => existingFilter !== filter);
      ArrayService.addToArray(myAllFilters, _.map(filtersToAdd, getRealFilterFromFilter));
      return myAllFilters;
    }

    function getBaseFilters() {
      return [tvFilter, titleFilter];
    }

    function getRealFilterBarFilters() {
      return _.map(self.filters, filter => getRealFilterFromFilter(filter));
    }

    function getRealFilterFromFilter(filter) {
      return show => {
        if (!!filter.cachedValues) {
          const checkedValues = _.where(filter.cachedValues, {isActive: true});
          return checkedValues.some(cachedValue => {
            return cachedValue.applyFilter(show);
          });
        } else {
          return false;
        }
      }
    }

    function tvFilter(show) {
      return ArrayService.exists(self.panelInfo.tvFilter) ? self.panelInfo.tvFilter(show) : true;
    }

    function titleFilter(show) {
      return self.titleSearch === undefined || show.title.toLowerCase().indexOf(self.titleSearch.toLowerCase()) > -1;
    }

    function getRegularOptions(filter) {
      return _.filter(filter.cachedValues, filterOption => !filterOption.allSpecial && !filterOption.noneSpecial);
    }

    function getAllSpecialOption(filter) {
      return _.findWhere(filter.cachedValues, {allSpecial: true});
    }

    function getNoneSpecialOption(filter) {
      return _.findWhere(filter.cachedValues, {noneSpecial: true});
    }

    function toggleAllRegularOptions(filter, isActive) {
      _.each(getRegularOptions(filter), filterOption => {
        filterOption.isActive = isActive;
      });
    }

    function checkAllRegularOptions(filter) {
      toggleAllRegularOptions(filter, true);
    }

    function uncheckAllRegularOptions(filter) {
      toggleAllRegularOptions(filter, false);
    }

    function runThroughFilterArray(filters, show) {
      return filters.every(filter => filter(show));
    }

    function updateAllSpecialDenorm(filter) {
      const allSpecial = getAllSpecialOption(filter);
      if (!!allSpecial) {
        const regulars = getRegularOptions(filter);
        allSpecial.isActive = !_.findWhere(regulars, {isActive: false});
      }
    }

    function updateNoneSpecialDenorm(filter) {
      const noneSpecial = getNoneSpecialOption(filter);
      if (!!noneSpecial) {
        const regulars = getRegularOptions(filter);
        noneSpecial.isActive = !_.findWhere(regulars, {isActive: true});
      }
    }

    function cachePossibleValues() {
      if (_.isArray(self.filters)) {
        _.each(self.filters, filter => {
          filter.cachedValues = filter.possibleValues();
          if (!!filter.allNone) {
            filter.cachedValues.push({
              valueLabel: 'All',
              isActive: true,
              special: 1,
              allSpecial: true,
              applyFilter: () => false
            });
            filter.cachedValues.push({
              valueLabel: 'None',
              isActive: false,
              special: 1,
              noneSpecial: true,
              applyFilter: () => false
            });
          }
        });
        if (self.filters.length > 0) {
          self.filtersReady = true;
        }
      }
    }

    function refreshCachedLabels() {
      if (_.isArray(self.filters)) {
        _.each(self.filters, filter => {
          const otherFilters = allFiltersBut(filter);
          const filteredShows = _.filter(self.getShows(), show => runThroughFilterArray(otherFilters, show));
          _.each(filter.cachedValues, cachedValue => {
            const withSubFilter = _.filter(filteredShows, cachedValue.applyFilter);
            cachedValue.valueCount = withSubFilter.length;
          });
        });
        if (self.filters.length > 0) {
          self.filtersReady = true;
        }
      }
    }


    // COMPARATORS

    function nullsLast(series) {
      const sort = getFieldWithDirection();
      const field = sort.field;
      if (_.isFunction(field)) {
        const groupScore = field.call(null, series);
        const direction = sort.direction === 'desc' ? -1 : 1;
        return !ArrayService.exists(groupScore) ? direction : 0;
      } else {
        return (series[field] === null) ? 1: 0;
      }
    }



  }


})();
