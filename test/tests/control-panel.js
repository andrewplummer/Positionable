
describe('ControlPanel', function(uiRoot) {

  var panel, listener;

  class Listener {

    onControlPanelDragStart() {}
    onControlPanelDragStop()  {}

    onShowSettingsClick()     {}
    onBasicSettingsClick()    {}
    onAdvancedSettingsClick() {}

  }

  setup(function() {
    listener = new Listener();
    panel = new ControlPanel(uiRoot, listener, true);
  });

  teardown(function() {
    panel.el.style.left = '';
    panel.el.style.bottom = '';
  });

  function getPanelElement(selector) {
    return getUiElement(document.documentElement, selector);
  }

  function getMockElements(count) {
    // The control panel is only checking the count of the array and making an
    // association on the index, so we can just mock these with null.
    return new Array(count).fill(null);
  }

  function resetPanelDimensions() {
    var el = uiRoot.getElementById('control-panel');
    el.style.width  = '';
    el.style.height = '';
  }

  function assertPanelElementClass(selector, className, expected) {
    assert.equal(getPanelElement(selector).classList.contains(className), expected !== false);
  }

  function assertPanelElementText(selector, expected) {
    assert.equal(getPanelElement(selector).textContent, expected);
  }

  function assertAreaActive(name) {
    assertPanelElementClass('#' + name + '-area', 'control-panel-area--active');
  }

  // --- Helpers

  it('should show all areas', function() {
    panel.showDefaultArea();
    assertAreaActive('default');
    panel.showElementArea();
    assertAreaActive('element');
    panel.showMultipleArea();
    assertAreaActive('multiple');
    panel.showSettingsArea();
    assertAreaActive('settings');
    panel.showQuickstartArea();
    assertAreaActive('quickstart');
    resetPanelDimensions();
  });

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
    var button = getPanelElement('#control-panel-settings-button');
    panel.showDefaultArea();
    clickElement(button);
    assertAreaActive('settings');
    clickElement(button);
    assertAreaActive('default');
  });

  // --- Rendering Element Area

  it('should render element area with single element', function() {
    panel.showElementArea();
    panel.renderElementSelector('.foo');
    panel.renderElementPosition('50px, 50px');
    panel.renderElementDimensions('100px, 100px');
    panel.renderElementZIndex('5');
    panel.renderElementTransform('45deg');
    assertPanelElementText('#element-selector',   '.foo');
    assertPanelElementText('#element-position',   '50px, 50px');
    assertPanelElementText('#element-dimensions', '100px, 100px');
    assertPanelElementText('#element-zindex',     '5z');
    assertPanelElementText('#element-transform',  '45deg');
  });

  it('should not render zIndex when empty empty fields', function() {
    var zIndexEl = getPanelElement('#element-zindex');
    panel.showElementArea();

    panel.renderElementZIndex('');
    assert.equal(zIndexEl.style.display, 'none');

    // Assure the elements are shown again when re-rendering
    panel.renderElementZIndex('10');
    assert.equal(zIndexEl.style.display, '');
    assert.equal(zIndexEl.textContent, '10z');
  });

  it('should deactivate transform when empty', function() {
    panel.showElementArea();
    panel.renderElementTransform('');
    assertPanelElementClass('#element-area', 'element-area--transform-active', false);

    panel.renderElementTransform('50deg');
    assertPanelElementText('#element-transform', '50deg');
    assertPanelElementClass('#element-area', 'element-area--transform-active');
  });

  it('should render background position and hide when not active', function() {
    panel.showElementArea();
    panel.renderElementBackgroundPosition('20px 40px');
    assertPanelElementText('#element-background-position', '20px 40px');
    assertPanelElementClass('#element-area', 'element-area--background-active');
  });

  // --- Rendering Nudge Modes

  it('should render mode area', function() {
    panel.showElementArea();
    panel.setNudgeMode('position');
    assert.equal(getPanelElement('#mode-position').style.display, 'block');
    panel.setNudgeMode('background');
    assert.equal(getPanelElement('#mode-position').style.display, 'none');
    assert.equal(getPanelElement('#mode-background').style.display, 'block');
  });

  it('should render mode in multiple area', function() {
    panel.showMultipleArea();
    assert.equal(getPanelElement('#mode-background').style.display, 'block');
    panel.setNudgeMode('position');
    var elementAreaPosition = getPanelElement('#mode-position');
    var display = window.getComputedStyle(elementAreaPosition).display;
    assert.equal(display, 'block');
  });

  // --- Rendering Multiple Area

  it('should render multiple selected', function() {
    var elements = getMockElements(5);
    panel.renderMultipleSelected(elements);
    assertPanelElementText('#multiple-header', '5 elements selected');
    assert.equal(getPanelElement('#distribute-buttons').style.display, '');
    assert.equal(getPanelElement('#highlight-buttons').children.length, 5);
  });

  it('should not render distribute buttons with only 2 elements selected', function() {
    var elements = getMockElements(2);
    panel.renderMultipleSelected(elements);
    assert.equal(getPanelElement('#distribute-buttons').style.display, 'none');
  });

  // --- Rendering Upgrade Prompt

  it('should render the upgrade form for a pro user', function() {
    panel.renderUpgradeStatus(true, 24 * 60 * 60 * 1000);
    assertPanelElementClass('#upgrade-prompt', 'upgrade-prompt--pro-user');
  });

  it('should render the upgrade form for a user on free trial', function() {
    panel.renderUpgradeStatus(false, 10 * 24 * 60 * 60 * 1000);
    assertPanelElementClass('#upgrade-prompt', 'upgrade-prompt--trial-active');
    assertPanelElementText('#upgrade-time-remaining', '10 days');
  });

  it('should render various free trial times', function() {
    panel.renderUpgradeStatus(false, 1 * 24 * 60 * 60 * 1000);
    assertPanelElementText('#upgrade-time-remaining', '1 day');
    panel.renderUpgradeStatus(false, 23 * 60 * 60 * 1000);
    assertPanelElementText('#upgrade-time-remaining', '23 hours');
    panel.renderUpgradeStatus(false, 60 * 60 * 1000);
    assertPanelElementText('#upgrade-time-remaining', '1 hour');
    panel.renderUpgradeStatus(false, 45 * 1000);
    assertPanelElementText('#upgrade-time-remaining', 'a few minutes');
  });

  it('should render the upgrade form for a user whose trial has expired', function() {
    panel.renderUpgradeStatus(false, 0);
    assertPanelElementClass('#upgrade-prompt', 'upgrade-prompt--trial-expired');
  });

});
