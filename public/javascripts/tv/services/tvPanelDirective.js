(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('tvPanel', tvPanel);

  function tvPanel() {
    return {
      templateUrl: 'views/tv/tvPanel.html',
      controller: ['$scope', tvPanelController],
      controllerAs: 'ctrl',
      scope: {
        shows: '=',
        panelInfo: '=',
        seriesDetailOpen: '='
      }
    }
  }

  function tvPanelController($scope) {
    const self = this;

    self.shows = $scope.shows;
    self.open = $scope.seriesDetailOpen;

    self.panelInfo = $scope.panelInfo;

    self.currentPageUpNext = 1;

    self.exists = function(object) {
      return !_.isUndefined(object) && !_.isNull(object);
    };

    self.pageSize = self.exists(self.panelInfo.pageLimit) ? self.panelInfo.pageLimit : 1000;


    self.imageColumnClass = function() {
      return (self.panelInfo.posterSize === 'small') ? 'col-md-2' : 'col-md-3';
    };

    self.totalItems = function() {
      return self.shows.filter(self.panelInfo.tvFilter).length;
    };

    self.panelFormat = function() {
      return self.exists(self.panelInfo.panelFormat) ? self.panelInfo.panelFormat : 'panel-default';
    };

    self.orderBy = function() {
      return [nullsLast, getFieldWithDirection(), 'title'];
    };

    function getFieldWithDirection() {
      const sort = self.panelInfo.sort;
      return sort.direction === 'asc' ? sort.field : '-' + sort.field;
    }

    self.showEmpty = function() {
      return self.exists(self.panelInfo.showEmpty) ? self.panelInfo.showEmpty : false;
    };

    self.subtitle = function(show) {
      return self.exists(self.panelInfo.subtitle) ? self.panelInfo.subtitle(show) : null;
    };

    self.posterInfo = {
          clickOverride: self.panelInfo.clickOverride,
          badgeField: self.panelInfo.badgeField
    };

    // COMPARATORS

    function nullsLast(series) {
      return (series[self.panelInfo.sort.field] === null) ? 1: 0;
    }



  }


})();