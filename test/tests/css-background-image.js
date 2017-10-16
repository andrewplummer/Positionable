
describe('CSSBackgroundImage', function(uiRoot) {

  var el, backgroundImage;

  setup(function() {
    el = appendAbsoluteBox();
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  it('should not render a null background position', function() {
    backgroundImage = CSSBackgroundImage.fromStyles('', 'initial');
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '');
  });

  it('should render a set background position', function() {
    backgroundImage = CSSBackgroundImage.fromStyles('', 'initial');
    backgroundImage.move(100, 100);
    backgroundImage.renderPosition(el.style);
    assert.equal(el.style.backgroundPosition, '100px 100px');
  });

  // --- CSS Declarations

  it('should append its CSS declaration', function() {
    var decs = [];
    backgroundImage = CSSBackgroundImage.fromStyles('', '40px 30px');
    backgroundImage.appendCSSDeclaration(decs);
    assert.equal(decs[0], 'background-position: 40px 30px;');
  });

  it('should not append its CSS declaration if initial position', function() {
    var decs = [];
    backgroundImage = CSSBackgroundImage.fromStyles('', 'initial');
    backgroundImage.appendCSSDeclaration(decs);
    assert.equal(decs.length, 0);
  });

});
