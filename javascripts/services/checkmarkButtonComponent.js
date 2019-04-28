angular.module('mediaMogulApp')
  .component('checkmarkButton', {
    templateUrl: 'views/checkmarkButton.html',
    controller: [checkmarkButtonController],
    controllerAs: 'ctrl',
    bindings: {
      label: '<',
      buttonIsToggled: '<',
      onClick: '<'
    }
  });

function checkmarkButtonController() {
  const self = this;

  self.getButtonClass = function() {
    if (self.buttonIsToggled()) {
      return 'btn-success';
    } else {
      return 'btn-tv-primary';
    }
  }

}

