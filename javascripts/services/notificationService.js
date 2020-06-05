angular.module('mediaMogulApp')
  .service('NotificationService', ['$log', '$http', 'LockService', 'ArrayService', 'SocketService',
    function($log, $http, LockService, ArrayService, SocketService) {
      const self = this;

      self.notifications = [];

      function fetchNotifications() {
        const payload = {
          person_id: LockService.getPersonID()
        }
        $http.get('/api/notifications', {params: payload}).then(results => {
          ArrayService.refreshArray(self.notifications, results.data);
        });
      }

      LockService.addCallback(fetchNotifications);

      self.dismissNotification = function(notification) {
        const payload = {
          person_id: LockService.getPersonID(),
          notification_id: notification.id,
          changedFields: {
            status: 'dismissed'
          }
        }
        $http.patch('/api/notifications', payload).then(() => {
          ArrayService.removeFromArray(self.notifications, notification);
        });
      };

    }]);


