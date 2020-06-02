angular.module('mediaMogulApp')
  .controller('friendsController', ['LockService', 'NavHelperService',
    function (LockService, NavHelperService) {
      const self = this;

      self.LockService = LockService;

      NavHelperService.changeSelectedNav('Friends');
    }

  ]);
