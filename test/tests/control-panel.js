
describe('ControlPanel', function(uiRoot) {

  var panel, listener;

  class Listener {

    onControlPanelDragStart() {}
    onControlPanelDragStop() {}
    onSettingsClick() {}

  }

  setup(function() {
    listener = new Listener();
    panel = new ControlPanel(uiRoot, listener, true);
  });

  teardown(function() {
    panel.el.style.left = '';
    panel.el.style.bottom = '';
  });

  function getMockElements(count) {
    // The control panel is only checking the count of the array and making an
    // association on the index, so we can just mock these with null.
    return new Array(count).fill(null);
  }

  // --- Helpers

  it('should have auto dimensions', function() {
    panel.render(panel.el.style);
    assert.equal(panel.el.style.width, '');
    assert.equal(panel.el.style.height, '');
  });

  it('should not be draggable before 5px', function() {
    dragElement(panel.el, 20, 780, 24, 784);
    assert.equal(panel.el.style.left, '');
    assert.equal(panel.el.style.bottom, '');
  });

  it('should be draggable after 5px', function() {
    dragElement(panel.el, 20, 780, 25, 775);
    assert.equal(panel.el.style.left, '25px');
    assert.equal(panel.el.style.bottom, '25px');
  });

  it('should not error when or ctrl key depressed', function() {
    fireMouseDown(panel.el, 20, 780);
    fireDocumentMetaKeyDown(KeyManager.META_KEY);
    fireDocumentCtrlKeyDown(KeyManager.CTRL_KEY);
    fireDocumentMetaMouseMove(400, 400);
    fireDocumentMetaMouseUp(400, 400);
    assert.equal(panel.el.style.left, '400px');
    assert.equal(panel.el.style.bottom, '400px');
  });

  it('should stay fixed while scrolling during drag', function() {

    fireMouseDown(panel.el, 20, 780);
    fireDocumentMouseMove(40, 580);
    whileFakeScrolled(500, () => {
      panel.onScroll();
    });
    fireDocumentMouseUp(20, 580);
    assert.equal(panel.el.style.left, '40px');
    assert.equal(panel.el.style.bottom, '220px');
  });

  it('should return to original position after double click', function() {
    dragElement(panel.el, 20, 780, 400, 400);
    fireDoubleClick(panel.el);
    assert.equal(panel.el.style.left, '20px');
    assert.equal(panel.el.style.bottom, '20px');
  });

  it('should toggle settings when button clicked', function() {
    var area   = getUiElement(document.documentElement, '#settings-area');
    var button = getUiElement(document.documentElement, '#control-panel-settings-button');
    panel.showDefaultArea();
    clickElement(button);
    assert.isTrue(area.classList.contains('control-panel-area--active'));
    clickElement(button);
    assert.isFalse(area.classList.contains('control-panel-area--active'));
  });

  // --- Rendering Element Area

  it('should render element area with single element', function() {
    panel.showElementArea();
    panel.renderElementSelector('.foo');
    panel.renderElementPosition('50px, 50px');
    panel.renderElementDimensions('100px, 100px');
    panel.renderElementZIndex('5');
    panel.renderElementTransform('45deg');
    assert.equal(getUiElement(document.documentElement, '#element-selector').textContent, '.foo');
    assert.equal(getUiElement(document.documentElement, '#element-position').textContent, '50px, 50px');
    assert.equal(getUiElement(document.documentElement, '#element-dimensions').textContent, '100px, 100px');
    assert.equal(getUiElement(document.documentElement, '#element-zindex').textContent, '5z');
    assert.equal(getUiElement(document.documentElement, '#element-transform').textContent, '45deg');
  });

  it('should not render zIndex when empty empty fields', function() {
    var zIndexEl = getUiElement(document.documentElement, '#element-zindex');
    panel.showElementArea();

    panel.renderElementZIndex('');
    assert.equal(zIndexEl.style.display, 'none');

    // Assure the elements are shown again when re-rendering
    panel.renderElementZIndex('10');
    assert.equal(zIndexEl.style.display, '');
    assert.equal(zIndexEl.textContent, '10z');
  });

  it('should deactivate transform when empty', function() {
    var areaEl = getUiElement(document.documentElement, '#element-area');
    var transformEl = getUiElement(document.documentElement, '#element-transform');

    panel.showElementArea();
    panel.renderElementTransform('');
    assert.isFalse(areaEl.classList.contains(ControlPanelElementArea.TRANSFORM_CLASS));

    panel.renderElementTransform('50deg');
    assert.equal(transformEl.textContent, '50deg');
    assert.isTrue(areaEl.classList.contains(ControlPanelElementArea.TRANSFORM_CLASS));
  });

  it('should render background position and hide when not active', function() {
    var areaEl = getUiElement(document.documentElement, '#element-area');
    var className = ControlPanelElementArea.BACKGROUND_CLASS;

    panel.showElementArea();
    panel.renderElementBackgroundPosition('20px 40px');
    assert.equal(getUiElement(document.documentElement, '#element-background-position').textContent, '20px 40px');
    assert.isTrue(areaEl.classList.contains(className));
  });

  // --- Rendering Nudge Modes

  it('should render mode area', function() {
    panel.showElementArea();
    panel.setNudgeMode('position');
    assert.equal(getUiElement(document.documentElement, '#mode-position').style.display, 'block');
    panel.setNudgeMode('background');
    assert.equal(getUiElement(document.documentElement, '#mode-position').style.display, 'none');
    assert.equal(getUiElement(document.documentElement, '#mode-background').style.display, 'block');
  });

  it('should render mode in multiple area', function() {
    panel.showMultipleArea();
    assert.equal(getUiElement(document.documentElement, '#mode-background').style.display, 'block');
    panel.setNudgeMode('position');
    var elementAreaPosition = getUiElement(document.documentElement, '#mode-position');
    var display = window.getComputedStyle(elementAreaPosition).display;
    assert.equal(display, 'block');
  });

  // --- Rendering Multiple Area

  it('should render multiple selected', function() {
    var elements = getMockElements(5);
    panel.renderMultipleSelected(elements);
    assert.equal(getUiElement(document.documentElement, '#multiple-header').textContent, '5 elements selected');
    assert.equal(getUiElement(document.documentElement, '#distribute-buttons').style.display, '');
    assert.equal(getUiElement(document.documentElement, '#highlight-buttons').children.length, 5);
  });

  it('should not render distribute buttons with only 2 elements selected', function() {
    var elements = getMockElements(2);
    panel.renderMultipleSelected(elements);
    assert.equal(getUiElement(document.documentElement, '#distribute-buttons').style.display, 'none');
  });

});
