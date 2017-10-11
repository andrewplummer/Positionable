
describe('ControlPanel', function(uiRoot) {

  var panel, listener, el;

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

  // --- Helpers

  function assertAreaVisible(areaName) {
    var className = `control-panel--${areaName}-active`;
    assert.isTrue(panel.el.classList.contains(className));
  }

  function setupSingle() {
    return new PositionableElement(appendAbsoluteBox());
  }

  function setupMultiple() {
    var els = [];
    els.push(new PositionableElement(appendAbsoluteBox()));
    els.push(new PositionableElement(appendAbsoluteBox()));
    return els;
  }

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

  // --- Rendering Element Area

  it('should render element area with single element', function() {
    panel.renderElementSelector('.foo');
    panel.renderElementPosition('50px, 50px');
    panel.renderElementDimensions('100px, 100px');
    panel.renderElementZIndex('5');
    panel.renderElementTransform('45deg');
    assert.equal(getUiElement(document.documentElement, '#element-area-selector').textContent, '.foo');
    assert.equal(getUiElement(document.documentElement, '#element-area-position').textContent, '50px, 50px');
    assert.equal(getUiElement(document.documentElement, '#element-area-dimensions').textContent, '100px, 100px');
    assert.equal(getUiElement(document.documentElement, '#element-area-zindex').textContent, '5z');
    assert.equal(getUiElement(document.documentElement, '#element-area-transform').textContent, '45deg');
  });

  it('should not render elements with empty fields', function() {
    panel.renderElementZIndex('');
    panel.renderElementTransform('');
    assert.equal(getUiElement(document.documentElement, '#element-area-zindex').style.display, 'none');
    assert.equal(getUiElement(document.documentElement, '#element-area-transform').style.display, 'none');

    // Assure the elements are shown again when re-rendering
    panel.renderElementZIndex('10');
    panel.renderElementTransform('50deg');
    assert.equal(getUiElement(document.documentElement, '#element-area-zindex').style.display, '');
    assert.equal(getUiElement(document.documentElement, '#element-area-transform').style.display, '');
    assert.equal(getUiElement(document.documentElement, '#element-area-zindex').textContent, '10z');
    assert.equal(getUiElement(document.documentElement, '#element-area-transform').textContent, '50deg');
  });

  // --- Rendering Align Area

  it('should render multiple selected', function() {
    panel.renderMultipleSelected(5);
    assert.equal(getUiElement(document.documentElement, '#align-area-header').textContent, '5 elements selected');
  });

});
