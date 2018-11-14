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
        seriesDetailOpen: '='
      }
    }
  }

  function tvPanelController($scope) {
    var self = this;

    self.header = $scope.header;
    self.shows = $scope.shows;
    self.tvFilter = $scope.tvFilter;
    self.open = $scope.seriesDetailOpen;

    self.currentPageUpNext = 1;
    self.pageSize = 12;

    self.countWhere = function(filter) {
      return self.shows.filter(filter).length;
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