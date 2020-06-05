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

      SocketService.on('notification_update', msg => {
        const matching = _.findWhere(self.notifications, {id: msg.notification_id});
        if (!!matching && msg.changedFields.status === 'dismissed') {
          removeNotification(matching);
        }
      });

      function removeNotification(notification) {
        ArrayService.removeFromArray(self.notifications, notification);
      }

      self.dismissNotification = function(notification) {
        const payload = {
          person_id: LockService.getPersonID(),
          notification_id: notification.id,
          changedFields: {
            status: 'dismissed'
          }
        }
        $http.patch('/api/notifications', payload).then(() => {
          removeNotification(notification);
        });
      };

    }]);


