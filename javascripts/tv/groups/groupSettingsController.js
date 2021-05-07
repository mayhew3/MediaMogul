angular.module('mediaMogulApp')
.controller('groupSettingsController', ['$log', '$uibModalInstance', 'tv_group_id',
  function($log, $uibModalInstance, tv_group_id) {
    const self = this;
    self.tv_group_id = tv_group_id;

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
