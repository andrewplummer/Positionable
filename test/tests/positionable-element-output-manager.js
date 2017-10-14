
describe('PositionableElementOutputManager', function(uiRoot) {

  var settings, manager;

  setup(function() {
    settings = new Settings({}, new MockLocalStorage(), uiRoot);
    manager  = new PositionableElementOutputManager(settings);
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  function appendPositionableElement() {
    var el = appendAbsoluteBox();
    return new PositionableElement(el);
  }

  function appendRotatedPositionableElement() {
    var el = appendRotatedBox();
    return new PositionableElement(el);
  }

  function appendTranslatedPositionableElement() {
    var el = appendTranslatedBox();
    return new PositionableElement(el);
  }

  function appendTransformedPositionableElement() {
    var el = appendTransformedBox();
    return new PositionableElement(el);
  }

  function appendSubpixelTransformedPositionableElement() {
    var el = appendSubpixelTransformedBox();
    return new PositionableElement(el);
  }

  function appendBackgroundImagePositionableElement() {
    var el = appendBackgroundImageBox();
    return new PositionableElement(el);
  }

  it('should get correct selector', function() {
    var element1 = appendPositionableElement();
    var element2 = appendPositionableElement();

    // Auto (first class)
    assert.equal(manager.getSelector(element2), '.box');

    // Auto (id)
    element2.el.setAttribute('id', 'foo');
    assert.equal(manager.getSelector(element2), '#foo');
    element2.el.removeAttribute('id');

    // First class
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_FIRST);
    assert.equal(manager.getSelector(element2), '.box');

    // Longest class
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_LONGEST);
    assert.equal(manager.getSelector(element2), '.absolute-box');

    // Tag
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG);
    assert.equal(manager.getSelector(element2), 'div');

    // Tag:nth
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG_NTH);
    assert.equal(manager.getSelector(element2), 'div:nth-child(2)');

    // None
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_NONE);
    assert.equal(manager.getSelector(element2), '');
    assert.equal(manager.getSelectorWithDefault(element2), '[element]');

  });

  it('should get correct headers for default box', function() {
    var element = appendPositionableElement();

    assert.equal(manager.getPositionHeader(element), '100px, 100px');
    assert.equal(manager.getDimensionsHeader(element), '100px, 100px');
    assert.equal(manager.getZIndexHeader(element), '2');
    assert.equal(manager.getTransformHeader(element), '');

  });

  it('should get correct header for a rotated box', function() {
    var element = appendRotatedPositionableElement();
    assert.equal(manager.getTransformHeader(element), '45deg');
  });

  it('should get correct header for a translated box', function() {
    var element = appendTranslatedPositionableElement();
    assert.equal(manager.getTransformHeader(element), '20px, 30px');
  });

  it('should get correct header for a rotated and translated box', function() {
    var element = appendTransformedPositionableElement();
    assert.equal(manager.getTransformHeader(element), '45deg, 20px, 30px');
  });

  it('should get correct header for a rotated and translated box using decimals', function() {
    var element = appendSubpixelTransformedPositionableElement();
    assert.equal(manager.getTransformHeader(element), '45.33deg, 20.23px, 30.21px');
  });

  it('should get correct background image', function() {
    var element = appendBackgroundImagePositionableElement();
    assert.equal(manager.getBackgroundPositionHeader(element), '20px, 40px');
  });

});
