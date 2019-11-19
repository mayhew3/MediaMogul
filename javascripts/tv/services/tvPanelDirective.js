(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('tvPanel', tvPanel);

  function tvPanel() {
    return {
      templateUrl: 'views/tv/tvPanel.html',
      controller: ['$scope', 'ArrayService', 'EpisodeService', 'GroupService', '$q', '$state', tvPanelController],
      controllerAs: 'ctrl',
      scope: {
        shows: '=',
        panelInfo: '=',
        onClick: '='
      }
    }
  }

  function tvPanelController($scope, ArrayService, EpisodeService, GroupService, $q, $state) {
    const self = this;

    self.EpisodeService = EpisodeService;

    self.shows = $scope.shows;
    self.onClick = $scope.onClick;

    self.panelInfo = $scope.panelInfo;
    self.ArrayService = ArrayService;

    self.showLoading = self.panelInfo.showLoading ? self.panelInfo.showLoading : () => false;
    self.showError = self.panelInfo.showError ? self.panelInfo.showError : () => false;

    self.currentPageUpNext = !!self.panelInfo.initialStateFilters && !!self.panelInfo.initialStateFilters.pageNumber ?
      self.panelInfo.initialStateFilters.pageNumber :
      1;

    self.titleSearch = undefined;

    self.showFilterBar = !!self.panelInfo.initialStateFilters && !_.isEmpty(self.panelInfo.initialStateFilters.filters);
    self.filters = self.panelInfo.filters;

    self.filtersCached = false;
    cachePossibleValues();

    self.defaultFiltersChanged = false;

    self.pageSize = ArrayService.exists(self.panelInfo.pageLimit) ? self.panelInfo.pageLimit : 1000;

    if (!$scope.shows) {
      self.EpisodeService.registerAsObserver($scope);
    }

    function isActive(filterOption) {
      return filterOption.isActive;
    }

    function hasChanged(filterOption) {
      return filterOption.isActive !== filterOption.defaultActive;
    }

    function isChanged(filter) {
      const changedRegulars = _.filter(getRegularOptions(filter), hasChanged);
      return !_.isEmpty(changedRegulars);
    }

    function getCheckedFiltersFor(filter) {
      const checkedRegulars = _.filter(getRegularOptions(filter), isActive);
      return _.map(checkedRegulars, filterOption => filterOption.valueID);
    }

    function mergeFilterParams(from_params) {
      const filters = {};
      _.each(self.filters, filter => {
        if (isChanged(filter)) {
          filters[filter.id] = getCheckedFiltersFor(filter);
        }
      });
      from_params.filters = filters;
      from_params.pageNumber = self.currentPageUpNext;
      return from_params;
    }

    self.clickHandler = function(series) {
      if (!self.onClick) {
        self.goTo(series);
      } else {
        self.onClick(series);
      }
    };

    self.goTo = function(series) {
      $state.transitionTo('tv.show',
        {
          series_id: series.id,
          viewer: self.panelInfo.backInfo.viewer,
          from_sref: self.panelInfo.backInfo.from_sref,
          from_params: {
            from_params: mergeFilterParams(self.panelInfo.backInfo.from_params)
          }
        },
        {
          reload: true,
          inherit: false,
          notify: true
        }
      );
    };


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
      const baseCondition = self.showLoading() ||
        self.showError() ||
        (self.showEmpty() && self.totalItems() === 0) ||
        self.totalItems() > 0;
      return baseCondition && extraShowPanelCondition();
    };

    self.getShows = function() {
      return self.shows ? self.shows : self.panelInfo.seriesFunction();
    };

    self.EpisodeService.registerDataPresentCallback({
      callback: refreshCachedLabels
    });

    self.showFilterOption = function(filterOption) {
      return !!filterOption.special || !!filterOption.valueCount;
    };

    self.toggleActive = function(filter, filterOption) {
      self.defaultFiltersChanged = true;
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

    self.getDropDownAlignmentClass = function(filter) {
      if (self.filters.length > 1 && _.last(self.filters) === filter) {
        return 'dropdown-menu-right';
      } else {
        return 'dropdown-menu-left';
      }
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

    function extraShowPanelCondition() {
      return !self.panelInfo.showPanel ? true : self.panelInfo.showPanel();
    }

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
      badgeColor: self.panelInfo.badgeColor,
      scoreValue: self.panelInfo.scoreValue,
      extraStyles: self.panelInfo.extraStyles,
      textOverlay: self.panelInfo.textOverlay,
      tooltipFunction: self.panelInfo.tooltipFunction
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

    function hasInitialStateOverride(filter) {
      if (!!self.panelInfo.initialStateFilters) {
        const matchingFilter = self.panelInfo.initialStateFilters.filters[filter.id];
        if (!!matchingFilter) {
          return true;
        }
      }
      return false;
    }

    function getOverrideState(cachedValue, filter) {
      if (!!self.panelInfo.initialStateFilters) {
        const matchingFilter = self.panelInfo.initialStateFilters.filters[filter.id];
        if (!!matchingFilter) {
          const matchingOption = _.find(matchingFilter, option => {
            return option === cachedValue.valueID
          });
          return !!matchingOption;
        }
      }
      return false;
    }

    function createIsActiveBasedOnDefaults(filter) {
      const cachedValues = filter.cachedValues;
      _.each(cachedValues, cachedValue => {
        if (hasInitialStateOverride(filter)) {
          cachedValue.isActive = getOverrideState(cachedValue, filter);
        } else {
          cachedValue.isActive = cachedValue.defaultActive;
        }
      });
    }

    function cacheValuesForFilter(filter) {
      return $q(resolve => {
        filter.possibleValues().then(values => {
          filter.cachedValues = values;
          createIsActiveBasedOnDefaults(filter);
          if (!!filter.allNone) {
            filter.cachedValues.push({
              valueLabel: 'All',
              isActive: false,
              special: 1,
              allSpecial: true,
              applyFilter: () => true
            });
            filter.cachedValues.push({
              valueLabel: 'None',
              isActive: false,
              special: 1,
              noneSpecial: true,
              applyFilter: () => false
            });
            updateAllSpecialDenorm(filter);
            updateNoneSpecialDenorm(filter);
          }
          resolve();
        })
      });
    }

    function cachePossibleValues() {
      if (_.isArray(self.filters)) {
        $q.all(_.map(self.filters, cacheValuesForFilter)).then(() => {
          self.filtersCached = true;
          refreshCachedLabels();
        });
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
