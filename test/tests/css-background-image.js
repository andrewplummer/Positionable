
describe('CSSBackgroundImage', function() {

  var el, backgroundImage;

  setup(function() {
    imageMock.apply();
    promiseMock.apply();
  });

  teardown(function() {
    releaseAppendedFixtures();
    imageMock.release();
    promiseMock.release();
  });

  function setupBackgroundImage(className) {
    var matcher;
    el = appendBox(className);
    matcher = new CSSRuleMatcher(el);
    backgroundImage = CSSBackgroundImage.fromMatcher(matcher);
  }

  function mockOrigin(origin) {
    CSSBackgroundImage.setOrigin(origin);
  }

  function setupXDomainBox(url) {

    chromeMock.apply();
    chromeMock.mockSendMessage({
      url: url,
      data: 'fake-data-uri',
      success: true
    });

    // We need to set fake dimensions on the image so that canvas
    // rendering doesn't fail.
    imageMock.setFakeDimensions(100, 100);

    // Using a fake rule matcher here to not have to go through
    // the page, which will try to load the fake images.
    var matcher = new MockCSSRuleMatcher();
    matcher.setProperty('backgroundImage', 'url(' + url + ')');
    matcher.setProperty('backgroundPosition', '0px 0px');
    backgroundImage = CSSBackgroundImage.fromMatcher(matcher);

    chromeMock.release();
  }

  it('should get its correct position string', function() {
    setupBackgroundImage('background-box');
    assert.equal(backgroundImage.getPositionString(), '20px 40px');
  });

  it('should get its correct position header', function() {
    setupBackgroundImage('background-box');
    assert.equal(backgroundImage.getPositionHeader(), '20px, 40px');
  });

  it('should not render a null background position', function() {
    setupBackgroundImage();
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '');
  });

  it('should render a set background position', function() {
    setupBackgroundImage('background-box');
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '20px 40px');
  });

  it('should render an initial background position', function() {
    setupBackgroundImage('background-initial-box');
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '');
  });

  it('should move a set background position', function() {
    setupBackgroundImage('background-box');
    backgroundImage.move(100, 100);
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '120px 140px');
  });

  it('should get the correct position for a percentage', function() {
    setupBackgroundImage('background-box background-percent-box');
    var p = backgroundImage.getPosition();
    assert.equal(p.x, 23.5);
    assert.equal(p.y, 47);
  });

  it('should set the correct position for a percentage', function() {
    setupBackgroundImage('background-box background-percent-box');
    backgroundImage.setPosition(94, 94);
    assert.equal(backgroundImage.getPositionString(), '100% 100%');
  });

  // --- CSS Declarations

  it('should not append its CSS declaration on initial', function() {
    var decs = [];
    setupBackgroundImage('background-initial-box');
    backgroundImage.appendCSSDeclaration(decs);
    assert.equal(decs.length, 0);
  });

  it('should append its CSS declaration if set', function() {
    var decs = [];
    setupBackgroundImage('background-box');
    backgroundImage = backgroundImage.clone();
    backgroundImage.appendCSSDeclaration(decs);
    assert.equal(decs[0], 'background-position: 20px 40px;');
  });

  // --- Other

  it('should report if it does not have an image', function() {
    setupBackgroundImage();
    assert.equal(backgroundImage.hasImage(), false);
  });

  it('should report if it does not have an image', function() {
    setupBackgroundImage('background-box');
    assert.equal(backgroundImage.hasImage(), true);
  });

  it('should correctly find the image and position from a single declaration', function() {
    setupBackgroundImage('background-only-box');
    assert.isTrue(backgroundImage.img.src.match(/^data:image\/png/));
    assert.equal(backgroundImage.cssLeft.px, 20);
    assert.equal(backgroundImage.cssTop.px,  20);
  });

  it('should update its position when percentages are used and dimensions have changed', function() {
    setupBackgroundImage('background-box background-percent-box');
    el.style.width  = '200px';
    el.style.height = '200px';
    backgroundImage.update();

    var p = backgroundImage.getPosition();
    assert.equal(p.x, 48.5);
    assert.equal(p.y, 97);
  });

  it('should correctly load a cross domain image', function() {
    setupXDomainBox('https://i.imgur.com/Z82AwNK.gifv');
    assert.equal(backgroundImage.img.src, 'fake-data-uri');
  });

  it('should treat local images as cross domain', function() {
    mockOrigin('file://');
    setupXDomainBox('file:///fake-image.png');
    assert.equal(backgroundImage.img.src, 'fake-data-uri');
  });

});
