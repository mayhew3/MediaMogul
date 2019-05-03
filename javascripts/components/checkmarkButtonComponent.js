angular.module('mediaMogulApp')
  .component('checkmarkButton', {
    templateUrl: 'views/checkmarkButton.html',
    controller: ['ArrayService', checkmarkButtonController],
    controllerAs: 'ctrl',
    bindings: {
      label: '<',
      checkedLabel: '<',
      buttonIsToggled: '<',
      onClick: '<',
      buttonClass: '<',
      isUpdating: '<'
    }
  });

function checkmarkButtonController(ArrayService) {
  const self = this;

  function hasUpdatingMethodAndIsUpdating() {
    return ArrayService.exists(self.isUpdating) && self.isUpdating();
  }

  self.getButtonClass = function() {
    if (ArrayService.exists(self.buttonClass)) {
      return self.buttonClass();
    } else {
      return '';
    }
  };

  self.getLabel = function() {
    if (hasCheckedLabelAndIsToggled()) {
      return self.checkedLabel;
    } else {
      return self.label;
    }
  };

  function hasCheckedLabelAndIsToggled() {
    return self.buttonIsToggled() && ArrayService.exists(self.checkedLabel);
  }

}

