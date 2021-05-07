angular.module('mediaMogulApp')
.controller('groupSettingsController', ['$log', '$uibModalInstance', 'tv_group_id', 'GroupService',
  function($log, $uibModalInstance, tv_group_id, GroupService) {
    const self = this;
    self.tv_group_id = tv_group_id;
    self.group = GroupService.getGroupWithID(self.tv_group_id);
    self.minWeight = +self.group.min_weight;

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
]);
