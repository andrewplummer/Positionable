
describe('ControlPanel', function(uiRoot) {

  var panel, listener;

  class Listener {

    onControlPanelDragStart() {
    }

    onControlPanelDragStop() {
    }

  }

  setup(function() {
    listener = new Listener();
    panel = new ControlPanel(uiRoot, listener);
  });

  teardown(function() {
    panel.el.style.left = '';
    panel.el.style.bottom = '';
  });

  it('should have auto dimensions', function() {
    panel.render(panel.el.style);
    assert.equal(panel.el.style.width, '');
    assert.equal(panel.el.style.height, '');
  });

  it('should be draggable', function() {
    dragElement(panel.el, 20, 780, 400, 400);
    assert.equal(panel.el.style.left, '400px');
    assert.equal(panel.el.style.bottom, '400px');
  });

  it('should return to original position after double click', function() {
    dragElement(panel.el, 20, 780, 400, 400);
    fireDoubleClick(panel.el);
    assert.equal(panel.el.style.left, '20px');
    assert.equal(panel.el.style.bottom, '20px');
  });

});
