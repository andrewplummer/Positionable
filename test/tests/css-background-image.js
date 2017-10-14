
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

});
