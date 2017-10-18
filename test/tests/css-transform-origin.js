
describe('CSSTransformOrigin', function(uiRoot) {

  var el;

  setup(function() {
    el = appendAbsoluteBox();
  });

  function assertOrigin(str, x, y, dim) {
    var origin = CSSTransformOrigin.create(str, el);
    var coords = origin.getCoords(dim);
    assert.equal(coords.x, x);
    assert.equal(coords.y, y);
  }

  function assertOriginWithDimensions(str, dimX, dimY, x, y) {
    var dim = new Point(dimX, dimY);
    assertOrigin(str, x, y, dim);
  }

  it('should be able to construct and get origin', function() {
    var origin = new CSSTransformOrigin(new CSSPixelValue(100), new CSSPixelValue(100));
    var coords = origin.getCoords();
    assert.equal(coords.x, 100);
    assert.equal(coords.y, 100);
  });

  // --- Parsing

  it('should be able to create an initial 50% 50% value from a null string', function() {
    assertOrigin('', 50, 50);
  });

  it('should allow null values', function() {
    assertOrigin(null, 50, 50);
  });

  it('should be able to create an initial 50% 50% value from initial string', function() {
    assertOrigin('initial', 50, 50);
  });

  it('should be able to create from absolute pixel values', function() {
    assertOrigin('10px 20px', 10, 20);
  });

  it('should be able to create from percent values', function() {
    el.style.width  = '250px';
    el.style.height = '250px';
    assertOrigin('10% 20%', 25, 50);
  });

  it('should be able to create from one absolute and one percent', function() {
    el.style.height = '250px';
    assertOrigin('75px 20%', 75, 50);
  });

  it('should be able to create from standard order keywords', function() {
    assertOrigin('left top',      0,   0);
    assertOrigin('left bottom',   0,   100);
    assertOrigin('right top',     100, 0);
    assertOrigin('right bottom',  100, 100);
    assertOrigin('center center', 50, 50);
  });

  it('should be able to create from reverse order keywords', function() {
    assertOrigin('top left',     0,   0);
    assertOrigin('bottom left',  0,   100);
    assertOrigin('top right',    100, 0);
    assertOrigin('bottom right', 100, 100);
  });

  it('should be able to create from single values', function() {
    assertOrigin('top',    50,  0);
    assertOrigin('left',   0,   50);
    assertOrigin('right',  100, 50);
    assertOrigin('bottom', 50,  100);
    assertOrigin('center', 50,  50);
    assertOrigin('5px',    5,  50);
  });

  it('should be able to create from single keyword and fixed', function() {
    assertOrigin('75px top',    75,  0);
    assertOrigin('75px center', 75,  50);
    assertOrigin('75px bottom', 75,  100);
    assertOrigin('left 75px',   0,   75);
    assertOrigin('center 75px', 50,  75);
    assertOrigin('right 75px',  100, 75);
  });

  it('should ignore third value', function() {
    assertOrigin('top left 10px',      0,   0);
    assertOrigin('center center 10px', 50,  50);
    assertOrigin('bottom right 10px',  100, 100);
    assertOrigin('75px 75px 10px',     75,  75);
  });

  // --- Passing Dimensions

  it('should get the origin with alternate dimensions passed and keywords', function() {
    assertOriginWithDimensions('left top',      500, 500, 0,   0);
    assertOriginWithDimensions('left bottom',   500, 500, 0,   500);
    assertOriginWithDimensions('right top',     500, 500, 500, 0);
    assertOriginWithDimensions('right bottom',  500, 500, 500, 500);
    assertOriginWithDimensions('center center', 500, 500, 250, 250);
  });

  it('should get the origin with alternate dimensions passed and percentages', function() {
    assertOriginWithDimensions('0% 0%',     500, 500, 0,   0);
    assertOriginWithDimensions('50% 50%',   500, 500, 250, 250);
    assertOriginWithDimensions('25% 25%',   500, 500, 125, 125);
    assertOriginWithDimensions('75% 75%',   500, 500, 375, 375);
    assertOriginWithDimensions('100% 100%', 500, 500, 500, 500);
  });

  it('should get the origin with alternate dimensions passed and absolute values', function() {
    assertOriginWithDimensions('25px 25px',     500, 500, 25,   25);
    assertOriginWithDimensions('800px 800px',   500, 500, 800, 800);
  });

  it('should get the origin with alternate dimensions passed and mixed', function() {
    assertOriginWithDimensions('25px top',    500, 500, 25,  0);
    assertOriginWithDimensions('25px bottom', 500, 500, 25,  500);
    assertOriginWithDimensions('25px 25%',    500, 500, 25,  125);
    assertOriginWithDimensions('left 25px',   500, 500, 0,   25);
    assertOriginWithDimensions('right 25px',  500, 500, 500, 25);
    assertOriginWithDimensions('25% 25px',    500, 500, 125, 25);
  });

});
