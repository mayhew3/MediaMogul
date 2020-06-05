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

      function getNotificationWithID(notification_id) {
        return _.findWhere(self.notifications, {id: notification_id});
      }

      SocketService.on('notification_create', notification => {
        const matching = getNotificationWithID(notification.id);
        if (!matching) {
          self.notifications.push(notification);
        }
      });

      SocketService.on('notification_update', msg => {
        const matching = getNotificationWithID(msg.notification_id);
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


