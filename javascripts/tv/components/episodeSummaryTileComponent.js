angular.module('mediaMogulApp')
  .component('episodeSummaryTile', {
    templateUrl: 'views/tv/episodeSummaryTile.html',
    controller: [episodeTileController],
    controllerAs: 'ctrl',
    bindings: {
      episode: '=',
      onClick: '<'
    }
  });

function episodeTileController() {

}
