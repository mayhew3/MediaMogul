angular.module('mediaMogulApp')
.controller('groupSettingsController', ['$log', '$uibModalInstance', 'tv_group_id', 'GroupService', 'LockService',
  function($log, $uibModalInstance, tv_group_id, GroupService, LockService) {
    const self = this;
    self.tv_group_id = tv_group_id;
    self.group = GroupService.getGroupWithID(self.tv_group_id);
    self.minWeight = (+self.group.min_weight) * 100;
    self.LockService = LockService;

    self.updateAndClose = function() {
      GroupService.changeMinWeight(self.tv_group_id, self.minWeight / 100).then(() => {
        $uibModalInstance.close();
      });
    };

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
