angular.module('mediaMogulApp')
  .component('episodeSummaryTile', {
    templateUrl: 'views/tv/episodeSummaryTile.html',
    controller: [episodeTileController],
    controllerAs: 'ctrl',
    bindings: {
      episode: '=',
      onClick: '<',
      tileClass: '<'
    }
  });

function episodeTileController() {
  const self = this;

  self.getTileClass = function() {
    return self.tileClass ? self.tileClass(self.episode) : '';
  };

  self.myOnClick = function() {
    if (self.onClick) {
      self.onClick(self.episode);
    }
  };
}
