
describe('BackgroundImage', function(uiRoot) {

  var el, backgroundImage;

  setup(function() {
    el = appendBackgroundImageBox();
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  it('should not render a null background position', function() {
    backgroundImage = BackgroundImage.fromStyles('', 'initial');
    backgroundImage.render(el.style);
    assert.equal(el.style.backgroundPosition, '');
  });

  it('should render a set background position', function() {
    backgroundImage = BackgroundImage.fromStyles('', 'initial');
    backgroundImage.move(100, 100);
    backgroundImage.render(el.style);
    assert.equal(el.style.backgroundPosition, '100px 100px');
  });

});
