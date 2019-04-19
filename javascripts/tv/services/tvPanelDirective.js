(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('tvPanel', tvPanel);

  function tvPanel() {
    return {
      templateUrl: 'views/tv/tvPanel.html',
      controller: ['$scope', 'ArrayService', 'EpisodeService', tvPanelController],
      controllerAs: 'ctrl',
      scope: {
        shows: '=',
        panelInfo: '=',
        onClick: '='
      }
    }
  }

  function tvPanelController($scope, ArrayService, EpisodeService) {
    const self = this;

    self.EpisodeService = EpisodeService;

    self.shows = $scope.shows;
    self.onClick = $scope.onClick;

    self.panelInfo = $scope.panelInfo;
    self.ArrayService = ArrayService;

    self.showLoading = self.panelInfo.showLoading ? self.panelInfo.showLoading : () => false;
    self.showError = self.panelInfo.showError ? self.panelInfo.showError : () => false;

    self.currentPageUpNext = 1;

    self.pageSize = ArrayService.exists(self.panelInfo.pageLimit) ? self.panelInfo.pageLimit : 1000;

    if (!$scope.shows) {
      self.EpisodeService.registerAsObserver($scope);
    }

    self.showPanel = function() {
      return self.showLoading() ||
          self.showError() ||
          (self.showEmpty() && self.totalItems() === 0) ||
          self.totalItems() > 0;
    };

    self.getShows = function() {
      return self.shows ? self.shows : self.EpisodeService.getMyShows();
    };

    self.imageColumnClass = function() {
      return (self.panelInfo.posterSize === 'small') ? 'col-xs-4 col-sm-2 col-md-2' : 'col-xs-6 col-sm-3 col-md-2';
    };

    self.tvFilter = function(show) {
      return ArrayService.exists(self.panelInfo.tvFilter) ? self.panelInfo.tvFilter(show) : true;
    };

    self.totalItems = function() {
      return self.getShows().length === 0 ? 0 :
        self.getShows().filter(self.tvFilter).length;
    };

    self.panelFormat = function() {
      return ArrayService.exists(self.panelInfo.panelFormat) ? self.panelInfo.panelFormat : 'panel-default';
    };

    self.orderBy = function() {
      return [nullsLast, getFieldWithDirection(), 'title'];
    };

    function getFieldWithDirection() {
      const sort = self.panelInfo.sort;
      return sort.direction === 'asc' ? sort.field : '-' + sort.field;
    }

    self.showEmpty = function() {
      return ArrayService.exists(self.panelInfo.showEmpty) ? self.panelInfo.showEmpty : false;
    };

    self.subtitle = function(show) {
      return ArrayService.exists(self.panelInfo.subtitle) ? self.panelInfo.subtitle(show) : null;
    };

    self.posterInfo = {
      clickOverride: self.panelInfo.clickOverride,
      badgeValue: self.panelInfo.badgeValue,
      alreadyExists: self.panelInfo.alreadyExists,
      shouldAskForPoster: self.panelInfo.shouldAskForPoster
    };

    // COMPARATORS

    function nullsLast(series) {
      return (series[self.panelInfo.sort.field] === null) ? 1: 0;
    }



  }


})();
