angular.module('mediaMogulApp')
  .controller('externalServicesController', ['$log', 'LockService', 'ExternalServicesService', '$scope',
    function($log, LockService, ExternalServicesService, $scope) {
      const self = this;

      self.LockService = LockService;
      self.ExternalServicesService = ExternalServicesService;

      self.ExternalServicesService.scopes.push($scope);

      self.timeAgo = function(timeThing) {
        return timeThing ? moment(timeThing).fromNow() : '';
      };

      self.getRowClass = function(service) {
        return self.ExternalServicesService.needsWarning(service) ? 'danger' : '';
      };

      self.getLastConnect = function(service) {
        return service.last_connect ? self.timeAgo(service.last_connect) : 'never';
      };

      self.getLastFailure = function(service) {
        return new Date(service.last_connect) > new Date(service.last_failure) ?
          '' :
          self.timeAgo(service.last_failure);
      }
    }
  ]);
