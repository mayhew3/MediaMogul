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
    var self = this;

    self.shows = $scope.shows;
    self.open = $scope.seriesDetailOpen;

    self.panelInfo = $scope.panelInfo;

    self.currentPageUpNext = 1;
    self.pageSize = 8;

    self.imageColumnClass = function() {
      return (self.panelInfo.posterSize === 'small') ? 'col-md-2' : 'col-md-3';
    };

    self.totalItems = function() {
      return self.shows.filter(self.panelInfo.tvFilter).length;
    };

    self.exists = function(object) {
      return !_.isUndefined(object) && !_.isNull(object);
    };

  }


})();