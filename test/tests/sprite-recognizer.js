
describe('SpriteRecognizer', function(uiRoot) {

  var el, url, img;

  setup(function() {
    imageLoadMock.apply();
    el = appendBackgroundImageBox();
    url = window.getComputedStyle(el).backgroundImage.match(/url\("(.+)"\)/)[1];
    img = new Image();
    img.src = url;
  });

  teardown(function() {
    imageLoadMock.release();
  });

  it('should not recognize sprite dimensions when no sprite found', function() {
    var recognizer = new SpriteRecognizer(img), bounds;
    bounds = recognizer.getSpriteBoundsForCoordinate(new Point(0, 0));
    assert.isUndefined(bounds);
    bounds = recognizer.getSpriteBoundsForCoordinate(new Point(0, 1));
    assert.isUndefined(bounds);
    bounds = recognizer.getSpriteBoundsForCoordinate(new Point(1, 0));
    assert.isUndefined(bounds);
  });

  it('should recognize close sprite', function() {
    var recognizer = new SpriteRecognizer(img), bounds;
    var bounds = recognizer.getSpriteBoundsForCoordinate(new Point(1, 1));
    assert.equal(bounds.left,   1);
    assert.equal(bounds.top,    1);
    assert.equal(bounds.right,  3);
    assert.equal(bounds.bottom, 3);
  });

  it('should recognize far sprite', function() {
    var recognizer = new SpriteRecognizer(img), bounds;
    var bounds = recognizer.getSpriteBoundsForCoordinate(new Point(3, 3));
    assert.equal(bounds.left,   3);
    assert.equal(bounds.top,    3);
    assert.equal(bounds.right,  5);
    assert.equal(bounds.bottom, 5);
  });

});
