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

    self.pageSize = ArrayService.exists(self.panelInfo.pageLimit) ? self.panelInfo.pageLimit : 1000;

    if (!$scope.shows) {
      self.EpisodeService.registerAsObserver($scope);
    }

    self.toggleFilterBar = () => self.showFilterBar = !self.showFilterBar;

    self.showQuickFilter = function() {
      return !!self.panelInfo.showQuickFilter;
    };

    self.allFilter = function(show) {
      return tvFilter(show) && titleFilter(show) && filterBarFilter(show);
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

    self.toggleActive = function(filterOption) {
      filterOption.isActive = !filterOption.isActive;
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

    function filterBarFilter(show) {
      if (self.filtersReady) {
        const filterResults = [];
        _.each(self.filters, filter => {
          const checkedValues = _.where(filter.cachedValues, {isActive: true});
          const orFilter = checkedValues.some(cachedValue => {
            return cachedValue.applyFilter(show);
          });
          filterResults.push(orFilter);
        });
        return filterResults.every(result => !!result);
      } else {
        return true;
      }
    }

    function tvFilter(show) {
      return ArrayService.exists(self.panelInfo.tvFilter) ? self.panelInfo.tvFilter(show) : true;
    }

    function titleFilter(show) {
      return self.titleSearch === undefined || show.title.toLowerCase().indexOf(self.titleSearch.toLowerCase()) > -1;
    }

    function refreshCachedLabels() {
      if (_.isArray(self.filters)) {
        _.each(self.filters, filter => {
          const filteredShows = _.filter(self.getShows(), self.allFilter);
          filter.cachedValues = filter.possibleValues(filteredShows);
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
