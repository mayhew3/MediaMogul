angular.module('mediaMogulApp')
  .service('UpdaterStatusService', ['$http', 'ArrayService', 'SocketService', UpdaterStatusService]);
function UpdaterStatusService($http, ArrayService, SocketService) {
  const self = this;

  self.SocketService = SocketService;

  let updaterConnected;
  let backupConnected;

  async function updateUpdaterStatus() {
    clearStatuses();
    const result = await $http.get('/api/updaterStatus');
    updaterConnected = result.data.updater_connected;
    backupConnected = result.data.backup_connected;
  }

  async function startup() {
    await updateUpdaterStatus();
    self.SocketService.on('disconnect', () => clearStatuses());
    self.SocketService.on('connect', () => updateUpdaterStatus());
    self.SocketService.on('updater_connect', () => {
      updaterConnected = true;
      console.log("Updater connect event!");
    });
    self.SocketService.on('updater_disconnect', () => {
      updaterConnected = false;
      console.log("Updater disconnect event!");
    });
    self.SocketService.on('backup_connect', () => {
      backupConnected = true;
      console.log("Backup connect event!");
    });
    self.SocketService.on('backup_disconnect', () => {
      backupConnected = false;
      console.log("Backup connect event!");
    });
  }

  function clearStatuses() {
    updaterConnected = undefined;
    backupConnected = undefined;
  }

  self.isUpdaterConnected = function() {
    return updaterConnected;
  };

  self.isBackupConnected = function() {
    return backupConnected;
  };

  // noinspection JSIgnoredPromiseFromCall
  startup();

}

