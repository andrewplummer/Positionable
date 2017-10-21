
describe('CSSBackgroundImage', function() {

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

  function setupElement(className) {
    el = appendBox(className);
    var matcher = new CSSRuleMatcher(el);
    backgroundImage = CSSBackgroundImage.fromMatcher(matcher);
  }

  it('should get its correct position string', function() {
    setupElement('background-box');
    assert.equal(backgroundImage.getPositionString(), '20px 40px');
  });

  it('should get its correct position header', function() {
    setupElement('background-box');
    assert.equal(backgroundImage.getPositionHeader(), '20px, 40px');
  });

  it('should not render a null background position', function() {
    setupElement();
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '');
  });

  it('should render a set background position', function() {
    setupElement('background-box');
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '20px 40px');
  });

  it('should render an initial background position', function() {
    setupElement('background-initial-box');
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '');
  });

  it('should move a set background position', function() {
    setupElement('background-box');
    backgroundImage.move(100, 100);
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '120px 140px');
  });

  it('should get the correct position for a percentage', function() {
    setupElement('background-percent-box');
    var p = backgroundImage.getPosition();
    assert.equal(p.x, 23.5);
    assert.equal(p.y, 47);
  });

  it('should set the correct position for a percentage', function() {
    setupElement('background-percent-box');
    backgroundImage.setPosition(94, 94);
    assert.equal(backgroundImage.getPositionString(), '100% 100%');
  });

  // --- CSS Declarations

  it('should not append its CSS declaration on initial', function() {
    var decs = [];
    setupElement('background-initial-box');
    backgroundImage.appendCSSDeclaration(decs);
    assert.equal(decs.length, 0);
  });

  it('should append its CSS declaration if set', function() {
    var decs = [];
    setupElement('background-box');
    backgroundImage = backgroundImage.clone();
    backgroundImage.appendCSSDeclaration(decs);
    assert.equal(decs[0], 'background-position: 20px 40px;');
  });

  // --- Other

  it('should report if it does not have an image', function() {
    setupElement();
    assert.equal(backgroundImage.hasImage(), false);
  });

  it('should report if it does not have an image', function() {
    setupElement('background-box');
    assert.equal(backgroundImage.hasImage(), true);
  });

  it('should update its position when percentages are used and dimensions have changed', function() {
    setupElement('background-percent-box');
    el.style.width  = '200px';
    el.style.height = '200px';
    backgroundImage.update();

    var p = backgroundImage.getPosition();
    assert.equal(p.x, 48.5);
    assert.equal(p.y, 97);
  });

});
