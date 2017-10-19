
describe('CSSTransformOrigin', function(uiRoot) {

  var el;

  setup(function() {
    el = appendAbsoluteBox();
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  function getTransformOrigin(str) {
    return CSSTransformOrigin.create(str, el);
  }

  function assertParsed(str, x, y) {
    var origin = getTransformOrigin(str);
    assert.equal(origin.cssX.px, x);
    assert.equal(origin.cssY.px, y);
  }

  function assertUpdated(str, updateWidth, updateHeight, x, y) {
    var origin = getTransformOrigin(str);
    el.style.width  = updateWidth;
    el.style.height = updateHeight;
    origin.update();
    assert.equal(origin.cssX.px, x);
    assert.equal(origin.cssY.px, y);
  }

  // --- Parsing

  it('should be able to create an initial 50% 50% value from a null string', function() {
    assertParsed('', 50, 50);
  });

  it('should allow null values', function() {
    assertParsed(null, 50, 50);
  });

  it('should be able to create an initial 50% 50% value from initial string', function() {
    assertParsed('initial', 50, 50);
  });

  it('should be able to create from absolute pixel values', function() {
    assertParsed('10px 20px', 10, 20);
  });

  it('should be able to create from percent values', function() {
    el.style.width  = '250px';
    el.style.height = '250px';
    assertParsed('10% 20%', 25, 50);
  });

  it('should be able to create from one absolute and one percent', function() {
    el.style.height = '250px';
    assertParsed('75px 20%', 75, 50);
  });

  it('should be able to create from standard order keywords', function() {
    assertParsed('left top',      0,   0);
    assertParsed('left bottom',   0,   100);
    assertParsed('right top',     100, 0);
    assertParsed('right bottom',  100, 100);
    assertParsed('center center', 50, 50);
  });

  it('should be able to create from reverse order keywords', function() {
    assertParsed('top left',     0,   0);
    assertParsed('bottom left',  0,   100);
    assertParsed('top right',    100, 0);
    assertParsed('bottom right', 100, 100);
  });

  it('should be able to create from single values', function() {
    assertParsed('top',    50,  0);
    assertParsed('left',   0,   50);
    assertParsed('right',  100, 50);
    assertParsed('bottom', 50,  100);
    assertParsed('center', 50,  50);
    assertParsed('5px',    5,  50);
  });

  it('should be able to create from single keyword and fixed', function() {
    assertParsed('75px top',    75,  0);
    assertParsed('75px center', 75,  50);
    assertParsed('75px bottom', 75,  100);
    assertParsed('left 75px',   0,   75);
    assertParsed('center 75px', 50,  75);
    assertParsed('right 75px',  100, 75);
  });

  it('should ignore third value', function() {
    assertParsed('top left 10px',      0,   0);
    assertParsed('center center 10px', 50,  50);
    assertParsed('bottom right 10px',  100, 100);
    assertParsed('75px 75px 10px',     75,  75);
  });

  // --- Updating

  it('should be able to update self when origin changes', function() {
    assertUpdated('', '200px', '200px', 100, 100);
    assertUpdated('top left', '200px', '200px', 0, 0);
    assertUpdated('right center', '200px', '200px', 200, 100);
    assertUpdated('25px 20%', '200px', '200px', 25, 40);
  });

});
