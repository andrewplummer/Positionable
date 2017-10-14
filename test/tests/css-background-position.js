
describe('CSSBackgroundPosition', function(uiRoot) {

  var el, backgroundPosition;

  setup(function() {
    el = appendAbsoluteBox();
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  it('should not render a null background position', function() {
    backgroundPosition = CSSBackgroundPosition.fromStyles('', 'initial');
    backgroundPosition.render(el.style);
    assert.equal(el.style.backgroundPosition, '');
  });

  it('should render a set background position', function() {
    backgroundPosition = CSSBackgroundPosition.fromStyles('', 'initial');
    backgroundPosition.move(100, 100);
    backgroundPosition.render(el.style);
    assert.equal(el.style.backgroundPosition, '100px 100px');
  });

});
