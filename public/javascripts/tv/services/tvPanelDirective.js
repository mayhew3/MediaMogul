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
        header: '=',
        shows: '=',
        tvFilter: '=',
        seriesDetailOpen: '=',
        showEmpty: '=',
        upcoming: '=',
        sortArray: '='
      }
    }
  }

  function tvPanelController($scope) {
    var self = this;

    self.header = $scope.header;
    self.shows = $scope.shows;
    self.tvFilter = $scope.tvFilter;
    self.open = $scope.seriesDetailOpen;
    self.showEmpty = $scope.showEmpty;
    self.upcoming = $scope.upcoming;
    self.sortArray = $scope.sortArray;

    self.currentPageUpNext = 1;
    self.pageSize = 8;

    self.imageColumnClass = function() {
      return (self.upcoming || self.header === "Up to Date") ? 'col-md-2' : 'col-md-3';
    };

    self.totalItems = function() {
      return self.shows.filter(self.tvFilter).length;
    };

    self.orderByMetacritic = function(series) {
      return (series.metacritic === null) ? 1: 0;
    };

    self.posterStyle = function(series) {
      if (series.recordingNow === true) {
        return {"border": "solid red"};
      } else {
        return {};
      }
    };

  }


})();