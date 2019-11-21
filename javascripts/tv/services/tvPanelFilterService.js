angular.module('mediaMogulApp')
.service('TVPanelFilterService', [TVPanelFilterService]);

function TVPanelFilterService() {
  const self = this;

  self.panel_id = null;
  self.filters = [];
  self.page_number = null;

  self.registerPanel = function(incoming_panel_id, incoming_filters, incoming_page_number) {
    if (self.panel_id !== incoming_panel_id) {
      self.panel_id = incoming_panel_id;
      self.filters = incoming_filters;
      self.page_number = incoming_page_number;
    }
  }
}
