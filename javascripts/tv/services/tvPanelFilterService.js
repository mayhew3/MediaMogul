angular.module('mediaMogulApp')
.service('TVPanelFilterService', [TVPanelFilterService]);

function TVPanelFilterService() {
  const self = this;

  const panels = [];

  self.panel_id = null;
  self.filters = [];
  self.page_number = null;

  self.registerPanel = function(incoming_panel_id, incoming_filters, incoming_page_number) {
    const existing = getPanel(incoming_panel_id);
    if (!existing) {
      const panelInfo = {
        panel_id: incoming_panel_id,
        filters: incoming_filters,
        page_number: incoming_page_number
      };
      panels.push(panelInfo);
      return panelInfo;
    } else {
      return existing;
    }
  };

  function getPanel(panel_id) {
    return _.findWhere(panels, {panel_id: panel_id});
  }

}
