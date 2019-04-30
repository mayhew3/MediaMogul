angular.module('mediaMogulApp')
  .component('checkmarkButton', {
    templateUrl: 'views/checkmarkButton.html',
    controller: ['ArrayService', checkmarkButtonController],
    controllerAs: 'ctrl',
    bindings: {
      label: '<',
      checkedLabel: '<',
      uncheckedTheme: '<',
      buttonIsToggled: '<',
      onClick: '<'
    }
  });

function checkmarkButtonController(ArrayService) {
  const self = this;

  self.getButtonClass = function() {
    if (self.buttonIsToggled()) {
      return 'btn-primary';
    } else {
      return self.uncheckedTheme ?
        'btn-' + self.uncheckedTheme :
        'btn-default';
    }
  };

  self.getLabel = function() {
    return (!self.buttonIsToggled() || !ArrayService.exists(self.checkedLabel)) ?
      self.label :
      self.checkedLabel;
  };

}

