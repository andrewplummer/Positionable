
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

  function setupBackgroundImage(className) {
    var matcher;
    el = appendBox(className);
    matcher = new CSSRuleMatcher(el);
    backgroundImage = CSSBackgroundImage.fromMatcher(matcher);
  }

  function setupXDomainBox(uri) {

    // It seems that appending an element with a background image
    // and then loading it's data uri into an Image will provide
    // enough time to load the image, however providing the exact
    // same string as the src without first appending the element
    // will not, so force the image to load by appending first here.
    //setupBackgroundImage('background-big-box');

    chromeMock.mockSendMessage({
      url: 'http://fake.com/fake.jpg',
      data: uri,
      success: true
    });

    // We need to set fake dimensions on the image so that canvas
    // rendering doesn't fail.
    imageLoadMock.setFakeDimensions(100, 100);
    setupBackgroundImage('background-x-domain-box');
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
    setupBackgroundImage('background-percent-box');
    var p = backgroundImage.getPosition();
    assert.equal(p.x, 23.5);
    assert.equal(p.y, 47);
  });

  it('should set the correct position for a percentage', function() {
    setupBackgroundImage('background-percent-box');
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

  it('should update its position when percentages are used and dimensions have changed', function() {
    setupBackgroundImage('background-percent-box');
    el.style.width  = '200px';
    el.style.height = '200px';
    backgroundImage.update();

    var p = backgroundImage.getPosition();
    assert.equal(p.x, 48.5);
    assert.equal(p.y, 97);
  });

  it('should correctly load a cross domain image', function() {
    setupXDomainBox('fake-data-uri');
    assert.equal(backgroundImage.img.src, 'fake-data-uri');
  });

});
