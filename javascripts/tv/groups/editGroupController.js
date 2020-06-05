angular.module('mediaMogulApp')
  .controller('editGroupController', ['GroupService', '$uibModalInstance', 'group',
    function(GroupService, $uibModalInstance, group) {
      const self = this;

      self.name = group.name;
      self.GroupService = GroupService;

      self.submitChanges = function() {
        const changedFields = {
          name: self.name
        };
        self.GroupService.updateGroup(group.id, changedFields).then(() => {
          $uibModalInstance.close();
        });
      };

      self.canSubmit = function() {
        return self.name !== group.name && self.name !== '';
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);
