
describe('SpriteRecognizer', function() {

  var recognizer;

  setup(function() {
    imageMock.apply();
  });

  teardown(function() {
    imageMock.release();
    releaseAppendedFixtures();
  });

  function setupRecognizer(url) {
    var img = new Image();
    img.src = url;
    recognizer = new SpriteRecognizer(img);
  }

  function setupElementRecognizer() {
    var el = appendBox('background-box');
    url = window.getComputedStyle(el).backgroundImage.match(/url\("(.+)"\)/)[1];
    setupRecognizer(url);
  }

  it('should not recognize sprite dimensions when no sprite found', function() {
    var bounds;
    setupElementRecognizer();
    bounds = recognizer.getSpriteBoundsForCoordinate(new Point(0, 0));
    assertUndefined(bounds);
    bounds = recognizer.getSpriteBoundsForCoordinate(new Point(0, 1));
    assertUndefined(bounds);
    bounds = recognizer.getSpriteBoundsForCoordinate(new Point(1, 0));
    assertUndefined(bounds);
  });

  it('should recognize close sprite', function() {
    var bounds;
    setupElementRecognizer();
    bounds = recognizer.getSpriteBoundsForCoordinate(new Point(1, 1));
    assertEqual(bounds.left,   1);
    assertEqual(bounds.top,    1);
    assertEqual(bounds.right,  3);
    assertEqual(bounds.bottom, 3);
  });

  it('should recognize far sprite', function() {
    var bounds;
    setupElementRecognizer();
    bounds = recognizer.getSpriteBoundsForCoordinate(new Point(3, 3));
    assertEqual(bounds.left,   3);
    assertEqual(bounds.top,    3);
    assertEqual(bounds.right,  5);
    assertEqual(bounds.bottom, 5);
  });

});
