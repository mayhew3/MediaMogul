angular.module('mediaMogulApp')
  .controller('adminTopController', ['LockService', 'EpisodeService', 'NavHelperService',
    function(LockService, EpisodeService, NavHelperService) {
      var self = this;

      self.LockService = LockService;

      NavHelperService.changeSelectedNav('Admin');

    }
  ]);

