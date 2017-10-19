
describe('CSSBackgroundImage', function(uiRoot) {

  var el, backgroundImage;

  setup(function() {
    promiseMock.apply();
    imageLoadMock.apply();
  });

  teardown(function() {
    releaseAppendedFixtures();
    promiseMock.release();
    imageLoadMock.release();
  });

  function setupStatic(sImage, sPosition) {
    el = appendAbsoluteBox();
    backgroundImage = CSSBackgroundImage.create(sImage, sPosition);
  }

  function setupElement(className) {
    el = appendAbsoluteBox(className);
    var matcher = new CSSRuleMatcher(el);
    var sImage    = matcher.getMatchedProperty('backgroundImage');
    var sPosition = matcher.getMatchedProperty('backgroundPosition');
    backgroundImage = CSSBackgroundImage.create(sImage, sPosition, el);
  }

  it('should get its correct position string', function() {
    setupElement('background-image-box');
    assert.equal(backgroundImage.getPositionString(), '20px 40px');
  });

  it('should get its correct position header', function() {
    setupElement('background-image-box');
    assert.equal(backgroundImage.getPositionHeader(), '20px, 40px');
  });

  it('should not render a null background position', function() {
    setupStatic('', 'initial');
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '');
  });

  it('should render a set background position', function() {
    setupStatic('', 'initial');
    backgroundImage.move(100, 100);
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '100px 100px');
  });

  it('should get the correct position for a percentage', function() {
    setupElement('background-image-box background-percent-box');
    var p = backgroundImage.getPosition();
    assert.equal(p.x, 23.5);
    assert.equal(p.y, 47);
  });

  it('should set the correct position for a percentage', function() {
    setupElement('background-image-box background-percent-box');
    backgroundImage.setPosition(94, 94);
    assert.equal(backgroundImage.getPositionString(), '100% 100%');
  });

  // --- CSS Declarations

  it('should append its CSS declaration', function() {
    var decs = [];
    setupStatic('', '40px 30px');
    backgroundImage.appendCSSDeclaration(decs);
    assert.equal(decs[0], 'background-position: 40px 30px;');
  });

  it('should not append its CSS declaration if initial position', function() {
    var decs = [];
    setupStatic('', 'initial');
    backgroundImage.appendCSSDeclaration(decs);
    assert.equal(decs.length, 0);
  });

  // --- Other

  it('should report if it does not have an image', function() {
    setupElement();
    assert.equal(backgroundImage.hasImage(), false);
  });

  it('should report if it does not have an image', function() {
    setupElement('background-image-box');
    assert.equal(backgroundImage.hasImage(), true);
  });

  it('should update its position when percentages are used and dimensions have changed', function() {
    setupElement('background-image-box background-percent-box');
    el.style.width  = '200px';
    el.style.height = '200px';
    backgroundImage.update();

    var p = backgroundImage.getPosition();
    assert.equal(p.x, 48.5);
    assert.equal(p.y, 97);
  });

});
