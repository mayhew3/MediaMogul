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
    self.pageSize = 8;

    self.exists = function(object) {
      return !_.isUndefined(object) && !_.isNull(object);
    };


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
      return self.exists(self.panelInfo.sortArray) ? self.panelInfo.sortArray : [orderByMetacritic, '-metacritic', 'title'];
    };

    self.showEmpty = function() {
      return self.exists(self.panelInfo.showEmpty) ? self.panelInfo.showEmpty : false;
    };

    self.hideBadge = function() {
      return self.exists(self.panelInfo.hideBadge) ? self.panelInfo.hideBadge : false;
    };

    self.subtitle = function(show) {
      return self.exists(self.panelInfo.subtitle) ? self.panelInfo.subtitle(show) : null;
    };

    self.click = self.exists(self.panelInfo.clickOverride) ?
      self.panelInfo.clickOverride :
      self.open;


    // COMPARATORS

    function orderByMetacritic(series) {
      return (series.metacritic === null) ? 1: 0;
    }


  }


})();