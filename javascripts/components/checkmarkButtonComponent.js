angular.module('mediaMogulApp')
  .component('checkmarkButton', {
    templateUrl: 'views/checkmarkButton.html',
    controller: ['ArrayService', checkmarkButtonController],
    controllerAs: 'ctrl',
    bindings: {
      label: '<',
      checkedLabel: '<',
      getLabel: '<',
      buttonIsToggled: '<',
      onClick: '<',
      buttonClass: '<',
      id: '<'
    }
  });

function checkmarkButtonController(ArrayService) {
  const self = this;

  self.getButtonClass = function() {
    if (ArrayService.exists(self.buttonClass)) {
      return self.buttonClass();
    } else {
      return '';
    }
  };

  self.getButtonLabel = function() {
    if (!!self.getLabel) {
      return self.getLabel();
    } else if (hasCheckedLabelAndIsToggled()) {
      return self.checkedLabel;
    } else {
      return self.label;
    }
  };

  function hasCheckedLabelAndIsToggled() {
    return self.buttonIsToggled() && ArrayService.exists(self.checkedLabel);
  }

}

