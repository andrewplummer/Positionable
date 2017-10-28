
describe('CSSBox', function() {

  var el, box;

  teardown(function() {
    releaseAppendedFixtures();
  });

  function setupBox(left, top, width, height) {
    [left, top, width, height] = getDefaults(arguments);
    box = CSSBox.fromPixelValues(left, top, width, height);
  }

  function setupInvertedBox(right, bottom, width, height) {
    [right, bottom, width, height] = getDefaults(arguments);
    box = new CSSBox(
      new CSSPositioningProperty(new CSSPixelValue(right),  'right'),
      new CSSPositioningProperty(new CSSPixelValue(bottom), 'bottom'),
      new CSSPixelValue(width),
      new CSSPixelValue(height)
    );
  }

  function getDefaults(args) {
    return args.length === 0 ? [100, 100, 100, 100] : args;
  }

  function setupElementBox(className) {
    var matcher;
    el = appendBox(className);
    matcher = new CSSRuleMatcher(el);
    box = CSSBox.fromMatcher(matcher);
  }

  function assertDimensions(x, y) {
    var dim = box.getDimensions();
    assert.equal(dim.x, x);
    assert.equal(dim.y, y);
  }

  function assertDirectionNormal(x, y) {
    var dir = box.getDirectionNormal();
    assert.equal(dir.x, x);
    assert.equal(dir.y, y);
  }

  function assertCornerNormal(corner, x, y) {
    var normal = box.getCornerNormal(corner);
    assert.equal(normal.x, x);
    assert.equal(normal.y, y);
  }

  function assertAnchorNormal(corner, x, y) {
    var normal = box.getAnchorNormal(corner);
    assert.equal(normal.x, x);
    assert.equal(normal.y, y);
  }

  function assertXYPosition(x, y) {
    var origin = box.getXYPosition();
    assert.equal(origin.x, x);
    assert.equal(origin.y, y);
  }

  function assertAnchorOffset(corner, x, y) {
    var offset = box.getAnchorOffset(corner);
    assert.equal(offset.x, x);
    assert.equal(offset.y, y);
  }

  function assertUnrotatedAnchorPosition(corner, x, y) {
    assertRotatedAnchorPosition(corner, 0, new Point(50, 50), x, y);
  }

  function assertCenterRotatedAnchorPosition(corner, x, y) {
    assertRotatedAnchorPosition(corner, 45, new Point(50, 50), x, y);
  }

  function assertTopLeftRotatedAnchorPosition(corner, x, y) {
    assertRotatedAnchorPosition(corner, 45, new Point(0, 0), x, y);
  }

  function assertBottomRightRotatedAnchorPosition(corner, x, y) {
    assertRotatedAnchorPosition(corner, 45, new Point(100, 100), x, y);
  }

  function assertFixedRotatedAnchorPosition(corner, x, y) {
    assertRotatedAnchorPosition(corner, 45, new Point(20, 30), x, y);
  }

  function assertRotatedAnchorPosition(corner, rotation, rotationOrigin, x, y) {
    var pos = box.getAnchorPosition(corner, rotation, rotationOrigin);
    assert.equalWithTolerance(pos.x, x, .5);
    assert.equalWithTolerance(pos.y, y, .5);
  }

  function assertConstrain(ratio, corner, offsetX, offsetY, horizontal, vertical, width, height) {
    var newBox = box.clone();
    newBox.resize(offsetX, offsetY, corner);
    newBox.constrain(ratio, corner);
    assert.equal(newBox.cssH.px,      horizontal);
    assert.equal(newBox.cssV.px,      vertical);
    assert.equal(newBox.cssWidth.px,  width);
    assert.equal(newBox.cssHeight.px, height);
  }

  function assertRender(left, top, width, height) {
    box.render(el.style);
    assert.equal(el.style.left,   left);
    assert.equal(el.style.top,    top);
    assert.equal(el.style.width,  width);
    assert.equal(el.style.height, height);
  }

  function assertInvertedRender(right, bottom, width, height) {
    box.render(el.style);
    assert.equal(el.style.right,  right);
    assert.equal(el.style.bottom, bottom);
    assert.equal(el.style.width,  width);
    assert.equal(el.style.height, height);
  }

  // --- Dimensions

  it('should be able to get its dimensions', function() {
    setupBox();
    assertDimensions(100, 100);
  });

  // --- Normals

  it('should get correct direction normal', function() {
    setupBox();
    assertDirectionNormal(1, 1);
  });

  it('should get correct direction normal for an inverted box', function() {
    setupInvertedBox();
    assertDirectionNormal(-1, -1);
  });

  it('should get correct corner normals', function() {
    setupBox();
    assertCornerNormal('n',   0, -1);
    assertCornerNormal('e',   1,  0);
    assertCornerNormal('s',   0,  1);
    assertCornerNormal('w',  -1,  0);
    assertCornerNormal('nw', -1, -1);
    assertCornerNormal('ne',  1, -1);
    assertCornerNormal('se',  1,  1);
    assertCornerNormal('sw', -1,  1);
  });

  it('should get correct anchor normals', function() {
    setupBox();
    assertAnchorNormal('n',   0,  1);
    assertAnchorNormal('e',  -1,  0);
    assertAnchorNormal('s',   0, -1);
    assertAnchorNormal('w',   1,  0);
    assertAnchorNormal('nw',  1,  1);
    assertAnchorNormal('ne', -1,  1);
    assertAnchorNormal('se', -1, -1);
    assertAnchorNormal('sw',  1, -1);
  });

  it('should get correct anchor normals for a reflected box', function() {
    setupBox(100, 100, -100, -100);
    assertAnchorNormal('n',   0, -1);
    assertAnchorNormal('e',   1,  0);
    assertAnchorNormal('s',   0,  1);
    assertAnchorNormal('w',  -1,  0);
    assertAnchorNormal('nw', -1, -1);
    assertAnchorNormal('ne',  1, -1);
    assertAnchorNormal('se',  1,  1);
    assertAnchorNormal('sw', -1,  1);
  });

  // --- Position

  it('should get the x/y position for a box', function() {
    setupBox();
    assertXYPosition(100, 100);
  });

  it('should get the x/y position for a box reflected along its nw anchor', function() {
    setupBox(100, 100, -100, -100);
    assertXYPosition(0, 0);
  });

  it('should get the x/y position for a box reflected along its se anchor', function() {
    setupBox(300, 300, -100, -100);
    assertXYPosition(200, 200);
  });

  it('should get the x/y position for an inverted box', function() {
    setupInvertedBox();
    assertXYPosition(-200, -200);
  });

  it('should get the x/y position for an inverted box reflected along its nw anchor', function() {
    setupInvertedBox(300, 300, -100, -100);
    assertXYPosition(-300, -300);
  });

  it('should get the x/y position for an inverted reflected box along its se anchor', function() {
    setupInvertedBox(100, 100, -100, -100);
    assertXYPosition(-100, -100);
  });

  // --- Anchor offsets

  it('should get anchor offsets for a box', function() {
    setupBox();
    assertAnchorOffset('nw', 100, 100);
    assertAnchorOffset('ne', 0,   100);
    assertAnchorOffset('se', 0,   0);
    assertAnchorOffset('sw', 100, 0);
  });

  it('should get anchor offsets for an inverted box', function() {
    setupInvertedBox();
    assertAnchorOffset('nw', 100, 100);
    assertAnchorOffset('ne', 0,   100);
    assertAnchorOffset('se', 0,   0);
    assertAnchorOffset('sw', 100, 0);
  });

  it('should get anchor offsets for a reflected box', function() {
    setupBox(100, 100, -100, -100);
    assertAnchorOffset('nw', 0,   0);
    assertAnchorOffset('ne', 100, 0);
    assertAnchorOffset('se', 100, 100);
    assertAnchorOffset('sw', 0,   100);
  });

  it('should get anchor offsets for an inverted reflected box', function() {
    setupInvertedBox(100, 100, -100, -100);
    assertAnchorOffset('nw', 0,   0);
    assertAnchorOffset('ne', 100, 0);
    assertAnchorOffset('se', 100, 100);
    assertAnchorOffset('sw', 0,   100);
  });

  // --- Unrotated anchor positions

  it('should get anchor positions for a box', function() {
    setupBox();
    assertUnrotatedAnchorPosition('nw', 200, 200);
    assertUnrotatedAnchorPosition('ne', 100, 200);
    assertUnrotatedAnchorPosition('se', 100, 100);
    assertUnrotatedAnchorPosition('sw', 200, 100);
  });

  it('should get anchor positions for a box reflected along its nw anchor', function() {
    setupBox(100, 100, -100, -100);
    assertUnrotatedAnchorPosition('nw', 0,   0);
    assertUnrotatedAnchorPosition('ne', 100, 0);
    assertUnrotatedAnchorPosition('se', 100, 100);
    assertUnrotatedAnchorPosition('sw', 0,   100);
  });

  it('should get anchor positions for a box reflected along its se anchor', function() {
    setupBox(300, 300, -100, -100);
    assertUnrotatedAnchorPosition('nw', 200, 200);
    assertUnrotatedAnchorPosition('ne', 300, 200);
    assertUnrotatedAnchorPosition('se', 300, 300);
    assertUnrotatedAnchorPosition('sw', 200, 300);
  });

  it('should get anchor positions for an inverted box', function() {
    setupInvertedBox();
    assertUnrotatedAnchorPosition('nw', -100, -100);
    assertUnrotatedAnchorPosition('ne', -200, -100);
    assertUnrotatedAnchorPosition('se', -200, -200);
    assertUnrotatedAnchorPosition('sw', -100, -200);
  });

  it('should get anchor positions for an inverted box reflected along its nw anchor', function() {
    setupInvertedBox(300, 300, -100, -100);
    assertUnrotatedAnchorPosition('nw', -300, -300);
    assertUnrotatedAnchorPosition('ne', -200, -300);
    assertUnrotatedAnchorPosition('se', -200, -200);
    assertUnrotatedAnchorPosition('sw', -300, -200);
  });

  it('should get anchor positions for an inverted box reflected along its se anchor', function() {
    setupInvertedBox(100, 100, -100, -100);
    assertUnrotatedAnchorPosition('nw', -100, -100);
    assertUnrotatedAnchorPosition('ne',  0,   -100);
    assertUnrotatedAnchorPosition('se',  0,    0);
    assertUnrotatedAnchorPosition('sw', -100,  0);
  });

  // --- Rotated anchor positions

  it('should get anchor positions for a rotated box', function() {
    setupBox();
    assertCenterRotatedAnchorPosition('nw', 150, 221);
    assertCenterRotatedAnchorPosition('ne', 79,  150);
    assertCenterRotatedAnchorPosition('se', 150, 79);
    assertCenterRotatedAnchorPosition('sw', 221, 150);
  });

  it('should get anchor positions for a rotated box reflected along its nw anchor', function() {
    setupBox(100, 100, -100, -100);
    assertCenterRotatedAnchorPosition('nw',  50, -21);
    assertCenterRotatedAnchorPosition('ne',  121, 50);
    assertCenterRotatedAnchorPosition('se',  50,  121);
    assertCenterRotatedAnchorPosition('sw', -21,  50);
  });

  it('should get anchor positions for a rotated box reflected along its se anchor', function() {
    setupBox(300, 300, -100, -100);
    assertCenterRotatedAnchorPosition('nw', 250, 179);
    assertCenterRotatedAnchorPosition('ne', 321, 250);
    assertCenterRotatedAnchorPosition('se', 250, 321);
    assertCenterRotatedAnchorPosition('sw', 179, 250);
  });

  it('should get anchor positions for a rotated inverted box', function() {
    setupInvertedBox();
    assertCenterRotatedAnchorPosition('nw', -150, -79);
    assertCenterRotatedAnchorPosition('ne', -221, -150);
    assertCenterRotatedAnchorPosition('se', -150, -221);
    assertCenterRotatedAnchorPosition('sw', -79,  -150);
  });

  it('should get anchor positions for a reflected inverted box reflected along its nw anchor', function() {
    setupInvertedBox(300, 300, -100, -100);
    assertCenterRotatedAnchorPosition('nw', -250, -321);
    assertCenterRotatedAnchorPosition('ne', -179, -250);
    assertCenterRotatedAnchorPosition('se', -250, -179);
    assertCenterRotatedAnchorPosition('sw', -321, -250);
  });

  it('should get anchor positions for a reflected inverted box reflected along its se anchor', function() {
    setupInvertedBox(100, 100, -100, -100);
    assertCenterRotatedAnchorPosition('nw', -50,  -121);
    assertCenterRotatedAnchorPosition('ne',  21,  -50);
    assertCenterRotatedAnchorPosition('se', -50,   21);
    assertCenterRotatedAnchorPosition('sw', -121, -50);
  });

  // --- Rotated anchor positions with top/left origin

  it('should get anchor positions for a rotated box with top/left origin', function() {
    setupBox();
    assertTopLeftRotatedAnchorPosition('nw', 100, 241);
    assertTopLeftRotatedAnchorPosition('ne', 29,  171);
    assertTopLeftRotatedAnchorPosition('se', 100, 100);
    assertTopLeftRotatedAnchorPosition('sw', 171, 171);
  });

  it('should get anchor positions for a rotated box reflected along its nw anchor with top/left origin', function() {
    setupBox(100, 100, -100, -100);
    assertTopLeftRotatedAnchorPosition('nw',  0,  0);
    assertTopLeftRotatedAnchorPosition('ne',  71, 71);
    assertTopLeftRotatedAnchorPosition('se',  0,  141);
    assertTopLeftRotatedAnchorPosition('sw', -71, 71);
  });

  it('should get anchor positions for a rotated box reflected along its se anchor with top/left origin', function() {
    setupBox(300, 300, -100, -100);
    assertTopLeftRotatedAnchorPosition('nw', 200, 200);
    assertTopLeftRotatedAnchorPosition('ne', 271, 271);
    assertTopLeftRotatedAnchorPosition('se', 200, 341);
    assertTopLeftRotatedAnchorPosition('sw', 129, 271);
  });

  it('should get anchor positions for a rotated inverted box with top/left origin', function() {
    setupInvertedBox();
    assertTopLeftRotatedAnchorPosition('nw', -200, -59);
    assertTopLeftRotatedAnchorPosition('ne', -271, -129);
    assertTopLeftRotatedAnchorPosition('se', -200, -200);
    assertTopLeftRotatedAnchorPosition('sw', -129, -129);
  });

  it('should get anchor positions for a rotated inverted box reflected along its nw anchor with top/left origin', function() {
    setupInvertedBox(300, 300, -100, -100);
    assertTopLeftRotatedAnchorPosition('nw', -300, -300);
    assertTopLeftRotatedAnchorPosition('ne', -229, -229);
    assertTopLeftRotatedAnchorPosition('se', -300, -159);
    assertTopLeftRotatedAnchorPosition('sw', -371, -229);
  });

  it('should get anchor positions for a rotated inverted box reflected along its se anchor with top/left origin', function() {
    setupInvertedBox(100, 100, -100, -100);
    assertTopLeftRotatedAnchorPosition('nw', -100, -100);
    assertTopLeftRotatedAnchorPosition('ne', -29,  -29);
    assertTopLeftRotatedAnchorPosition('se', -100,  41);
    assertTopLeftRotatedAnchorPosition('sw', -171, -29);
  });

  // --- Rotated anchor positions with bottom/right origin

  it('should get anchor positions for a rotated box with bottom/right origin', function() {
    setupBox();
    assertBottomRightRotatedAnchorPosition('nw', 200, 200);
    assertBottomRightRotatedAnchorPosition('ne', 129, 129);
    assertBottomRightRotatedAnchorPosition('se', 200, 59);
    assertBottomRightRotatedAnchorPosition('sw', 271, 129);
  });

  it('should get anchor positions for a rotated box reflected along its nw anchor with bottom/right origin', function() {
    setupBox(100, 100, -100, -100);
    assertBottomRightRotatedAnchorPosition('nw', 100, -41);
    assertBottomRightRotatedAnchorPosition('ne', 171,  29);
    assertBottomRightRotatedAnchorPosition('se', 100,  100);
    assertBottomRightRotatedAnchorPosition('sw', 29,   29);
  });

  it('should get anchor positions for a rotated box reflected along its se anchor with bottom/right origin', function() {
    setupBox(300, 300, -100, -100);
    assertBottomRightRotatedAnchorPosition('nw', 300, 159);
    assertBottomRightRotatedAnchorPosition('ne', 371, 229);
    assertBottomRightRotatedAnchorPosition('se', 300, 300);
    assertBottomRightRotatedAnchorPosition('sw', 229, 229);
  });

  it('should get anchor positions for a rotated inverted box with bottom/right origin', function() {
    setupInvertedBox();
    assertBottomRightRotatedAnchorPosition('nw', -100, -100);
    assertBottomRightRotatedAnchorPosition('ne', -171, -171);
    assertBottomRightRotatedAnchorPosition('se', -100, -241);
    assertBottomRightRotatedAnchorPosition('sw', -29,  -171);
  });

  it('should get anchor positions for a rotated inverted box reflected along its nw anchor with bottom/right origin', function() {
    setupInvertedBox(300, 300, -100, -100);
    assertBottomRightRotatedAnchorPosition('nw', -200, -341);
    assertBottomRightRotatedAnchorPosition('ne', -129, -271);
    assertBottomRightRotatedAnchorPosition('se', -200, -200);
    assertBottomRightRotatedAnchorPosition('sw', -271, -271);
  });

  it('should get anchor positions for a rotated inverted box reflected along its se anchor with bottom/right origin', function() {
    setupInvertedBox(100, 100, -100, -100);
    assertBottomRightRotatedAnchorPosition('nw',  0,  -141);
    assertBottomRightRotatedAnchorPosition('ne',  71, -71);
    assertBottomRightRotatedAnchorPosition('se',  0,   0);
    assertBottomRightRotatedAnchorPosition('sw', -71, -71);
  });

  // --- Rotated anchor positions with fixed origin

  it('should get anchor positions for a rotated box with fixed origin', function() {
    setupBox();
    assertFixedRotatedAnchorPosition('nw', 127, 236);
    assertFixedRotatedAnchorPosition('ne', 56,  165);
    assertFixedRotatedAnchorPosition('se', 127, 95);
    assertFixedRotatedAnchorPosition('sw', 198, 165);
  });

  it('should get anchor positions for a rotated box reflected along its nw anchor with fixed origin', function() {
    setupBox(100, 100, -100, -100);
    assertFixedRotatedAnchorPosition('nw',  27, -5);
    assertFixedRotatedAnchorPosition('ne',  98,  65);
    assertFixedRotatedAnchorPosition('se',  27,  136);
    assertFixedRotatedAnchorPosition('sw', -44,  65);
  });

  it('should get anchor positions for a rotated box reflected along its se anchor with fixed origin', function() {
    setupBox(300, 300, -100, -100);
    assertFixedRotatedAnchorPosition('nw', 227, 195);
    assertFixedRotatedAnchorPosition('ne', 298, 265);
    assertFixedRotatedAnchorPosition('se', 227, 336);
    assertFixedRotatedAnchorPosition('sw', 156, 265);
  });

  it('should get anchor positions for a rotated inverted box with fixed origin', function() {
    setupInvertedBox();
    assertFixedRotatedAnchorPosition('nw', -173, -64);
    assertFixedRotatedAnchorPosition('ne', -244, -135);
    assertFixedRotatedAnchorPosition('se', -173, -205);
    assertFixedRotatedAnchorPosition('sw', -102, -135);
  });

  it('should get anchor positions for a rotated inverted box reflected along its nw anchor with fixed origin', function() {
    setupInvertedBox(300, 300, -100, -100);
    assertFixedRotatedAnchorPosition('nw', -273, -305);
    assertFixedRotatedAnchorPosition('ne', -202, -235);
    assertFixedRotatedAnchorPosition('se', -273, -164);
    assertFixedRotatedAnchorPosition('sw', -344, -235);
  });

  it('should get anchor positions for a rotated inverted box reflected along its se anchor with fixed origin', function() {
    setupInvertedBox(100, 100, -100, -100);
    assertFixedRotatedAnchorPosition('nw', -73,  -105);
    assertFixedRotatedAnchorPosition('ne', -2,   -35);
    assertFixedRotatedAnchorPosition('se', -73,   36);
    assertFixedRotatedAnchorPosition('sw', -144, -35);
  });

  // --- Constraining

  it('should not constrain if there are not two edges to constrain by', function() {
    setupBox();
    assertConstrain(2, 'n', 0, 0, 100, 100, 100, 100);
  });

  it('should constrain to 1:1 from se in all directions', function() {
    setupBox();
    assertConstrain(1, 'se',  0,    0,   100, 100,  100,  100);
    assertConstrain(1, 'se', -50,   0,   100, 100,  50,   50);
    assertConstrain(1, 'se', -100,  0,   100, 100,  0,    0);
    assertConstrain(1, 'se', -150,  0,   100, 100, -50,   50);
    assertConstrain(1, 'se', -200,  0,   100, 100, -100,  100);
    assertConstrain(1, 'se', -200, -50,  100, 100, -50,   50);
    assertConstrain(1, 'se', -200, -100, 100, 100,  0,    0);
    assertConstrain(1, 'se', -200, -150, 100, 100, -50,  -50);
    assertConstrain(1, 'se', -200, -200, 100, 100, -100, -100);
    assertConstrain(1, 'se', -150, -200, 100, 100, -50,  -50);
    assertConstrain(1, 'se', -100, -200, 100, 100,  0,    0);
    assertConstrain(1, 'se', -50,  -200, 100, 100,  50,  -50);
    assertConstrain(1, 'se',  0,   -200, 100, 100,  100, -100);
    assertConstrain(1, 'se',  0,   -150, 100, 100,  50,  -50);
    assertConstrain(1, 'se',  0,   -100, 100, 100,  0,    0);
    assertConstrain(1, 'se',  0,   -50,  100, 100,  50,   50);
  });

  it('should constrain to 1:1 from nw in all directions', function() {
    setupBox();
    assertConstrain(1, 'nw', 0,   0,   100, 100,  100,  100);
    assertConstrain(1, 'nw', 50,  0,   150, 150,  50,   50);
    assertConstrain(1, 'nw', 100, 0,   200, 200,  0,    0);
    assertConstrain(1, 'nw', 150, 0,   250, 150, -50,   50);
    assertConstrain(1, 'nw', 200, 0,   300, 100, -100,  100);
    assertConstrain(1, 'nw', 200, 50,  250, 150, -50,   50);
    assertConstrain(1, 'nw', 200, 100, 200, 200,  0,    0);
    assertConstrain(1, 'nw', 200, 150, 250, 250, -50,  -50);
    assertConstrain(1, 'nw', 200, 200, 300, 300, -100, -100);
    assertConstrain(1, 'nw', 150, 200, 250, 250, -50,  -50);
    assertConstrain(1, 'nw', 100, 200, 200, 200,  0,    0);
    assertConstrain(1, 'nw', 50,  200, 150, 250,  50,  -50);
    assertConstrain(1, 'nw', 0,   200, 100, 300,  100, -100);
    assertConstrain(1, 'nw', 0,   150, 150, 250,  50,  -50);
    assertConstrain(1, 'nw', 0,   100, 200, 200,  0,    0);
    assertConstrain(1, 'nw', 0,   50,  150, 150,  50,   50);
  });

  it('should constrain to 2:1 from se in major directions', function() {
    setupBox();
    assertConstrain(2, 'se',  0,    0,   100, 100,  100,  50);
    assertConstrain(2, 'se', -100,  0,   100, 100,  0,    0);
    assertConstrain(2, 'se', -200,  0,   100, 100, -100,  50);
    assertConstrain(2, 'se', -200, -100, 100, 100,  0,    0);
    assertConstrain(2, 'se', -200, -200, 100, 100, -100, -50);
    assertConstrain(2, 'se', -100, -200, 100, 100,  0,    0);
    assertConstrain(2, 'se',  0,   -200, 100, 100,  100, -50);
    assertConstrain(2, 'se',  0,   -100, 100, 100,  0,    0);
  });

  it('should constrain to 2:1 from nw in major directions', function() {
    setupBox();
    assertConstrain(2, 'nw', 0,   0,   100, 150,  100,  50);
    assertConstrain(2, 'nw', 100, 0,   200, 200,  0,    0);
    assertConstrain(2, 'nw', 200, 0,   300, 150, -100,  50);
    assertConstrain(2, 'nw', 200, 100, 200, 200,  0,    0);
    assertConstrain(2, 'nw', 200, 200, 300, 250, -100, -50);
    assertConstrain(2, 'nw', 100, 200, 200, 200,  0,    0);
    assertConstrain(2, 'nw', 0,   200, 100, 250,  100, -50);
    assertConstrain(2, 'nw', 0,   100, 200, 200,  0,    0);
  });

  it('should constrain an inverted box to 2:1 from se in major directions', function() {
    setupInvertedBox();
    assertConstrain(2, 'se',  0,    0,   100, 150,  100,  50);
    assertConstrain(2, 'se', -100,  0,   200, 200,  0,    0);
    assertConstrain(2, 'se', -200,  0,   300, 150, -100,  50);
    assertConstrain(2, 'se', -200, -100, 200, 200,  0,    0);
    assertConstrain(2, 'se', -200, -200, 300, 250, -100, -50);
    assertConstrain(2, 'se', -100, -200, 200, 200,  0,    0);
    assertConstrain(2, 'se',  0,   -200, 100, 250,  100, -50);
    assertConstrain(2, 'se',  0,   -100, 200, 200,  0,    0);
  });

  it('should constrain an inverted box to 2:1 from nw in major directions', function() {
    setupInvertedBox();
    assertConstrain(2, 'nw', 0,   0,   100, 100,  100,  50);
    assertConstrain(2, 'nw', 100, 0,   100, 100,  0,    0);
    assertConstrain(2, 'nw', 200, 0,   100, 100, -100,  50);
    assertConstrain(2, 'nw', 200, 100, 100, 100,  0,    0);
    assertConstrain(2, 'nw', 200, 200, 100, 100, -100, -50);
    assertConstrain(2, 'nw', 100, 200, 100, 100,  0,    0);
    assertConstrain(2, 'nw', 0,   200, 100, 100,  100, -50);
    assertConstrain(2, 'nw', 0,   100, 100, 100,  0,    0);
  });

  // --- Rendering

  it('should correctly render a moved inverted box', function() {
    setupElementBox('inverted-box');
    box.move(50, 50);
    assertInvertedRender('50px', '50px', '100px', '100px');
  });

  it('should correctly render a nw resized invertd box', function() {
    setupElementBox('inverted-box');
    box.resize(50, 60, 'nw');
    assertInvertedRender('100px', '100px', '50px', '40px');
  });

  it('should correctly render a se resized inverted box', function() {
    setupElementBox('inverted-box');
    box.resize(-50, -50, 'se');
    assertInvertedRender('150px', '150px', '50px', '50px');
  });

  it('should not allow opposite edges to go into negative values', function() {
    setupElementBox();
    box.resize(-150, -200, 'se');
    assertRender('50px', '0px', '50px', '100px');
  });

  it('should not allow positioned edges to go into negative values', function() {
    setupElementBox();
    box.resize(150, 150, 'nw');
    assertRender('200px', '200px', '50px', '50px');
  });

  it('should not allow opposite edges on inverted boxes to go into negative values', function() {
    setupElementBox('inverted-box');
    box.resize(150, 200, 'nw');
    assertInvertedRender('50px', '0px', '50px', '100px');
  });

  it('should not allow positioned edges on inverted boxes to go into negative values', function() {
    setupElementBox('inverted-box');
    box.resize(-150, -150, 'se');
    assertInvertedRender('200px', '200px', '50px', '50px');
  });

  // --- CSS declarations

  it('should append its CSS declarations', function() {
    setupBox(100, 100, 150, 150);
    var decs = [];
    box.appendCSSDeclarations(decs);
    assert.equal(decs[0], 'top: 100px;');
    assert.equal(decs[1], 'left: 100px;');
    assert.equal(decs[2], 'width: 150px;');
    assert.equal(decs[3], 'height: 150px;');
  });

  // --- Other

  it('should be able to clone itself', function() {
    setupBox();
    var clone = box.clone();
    assert.equal(clone.cssH.px,      100);
    assert.equal(clone.cssV.px,      100);
    assert.equal(clone.cssWidth.px,  100);
    assert.equal(clone.cssHeight.px, 100);
  });

  it('should get its ratio', function() {
    setupBox(100, 100, 100, 50);
    assert.equal(box.getRatio(), 2);
  });

  it('should get the ratio of an inverted box', function() {
    setupInvertedBox(100, 100, 120, 40);
    assert.equal(box.getRatio(), 3);
  });

  it('should not fail to get the ratio when the dimensions are 0', function() {
    setupInvertedBox(100, 100, 0, 0);
    assert.equal(box.getRatio(), 0);
  });

  it('should validate a reflected box to become a normal one', function() {
    setupBox(200, 200, -100, -100);
    box.validate();
    assert.equal(box.cssH.px,      100);
    assert.equal(box.cssV.px,      100);
    assert.equal(box.cssWidth.px,  100);
    assert.equal(box.cssHeight.px, 100);
  });

  it('should get its position header', function() {
    setupBox(100, 100, 150, 150);
    assert.equal(box.getPositionHeader(), '100px, 100px');
    assert.equal(box.getDimensionsHeader(), '150px, 150px');
  });

});
