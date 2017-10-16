
describe('CSSBox', function(uiRoot) {

  var el, box;

  function setupNormal() {
    el = appendAbsoluteBox();
    box = CSSBox.fromElement(el);
  }

  function setupInverted() {
    el = appendInvertedBox();
    box = CSSBox.fromElement(el);
  }

  function setupPixel(left, top, width, height) {
    el = appendAbsoluteBox();
    box = CSSBox.fromPixelValues(left, top, width, height);
  }

  teardown(function() {
    releaseAppendedFixtures();
  });

  it('should be able to get its position', function() {
    setupNormal();
    assert.equal(box.getOffsetPosition().x, 100);
    assert.equal(box.getOffsetPosition().y, 100);
  });

  it('should be able to get its dimensions', function() {
    setupNormal();
    assert.equal(box.getDimensions().x, 100);
    assert.equal(box.getDimensions().y, 100);
  });

  it('should be able to move', function() {
    setupNormal();
    box.addOffsetPosition(50, 50);
    box.render(el.style);
    assert.equal(el.style.left,   '150px');
    assert.equal(el.style.top,    '150px');
    assert.equal(el.style.right,  '');
    assert.equal(el.style.bottom, '');
  });

  it('should be able to move an inverted box', function() {
    setupInverted();
    box.addOffsetPosition(50, 50);
    box.render(el.style);
    assert.equal(el.style.left,   '');
    assert.equal(el.style.top,    '');
    assert.equal(el.style.bottom, '50px');
    assert.equal(el.style.right,  '50px');
  });

  it('should move the opposite edges of a normal box', function() {
    setupNormal();

    box.moveEdges(50, 60, 'se');
    box.render(el.style);

    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '150px');
    assert.equal(el.style.height, '160px');
    assert.equal(el.style.right,  '');
    assert.equal(el.style.bottom, '');

  });

  it('should move the opposite edges of an inverted box', function() {
    setupInverted();

    box.moveEdges(50, 60, 'nw');
    box.render(el.style);

    assert.equal(el.style.left,   '');
    assert.equal(el.style.top,    '');
    assert.equal(el.style.right,  '100px');
    assert.equal(el.style.bottom, '100px');
    assert.equal(el.style.width,  '50px');
    assert.equal(el.style.height, '40px');

  });

  it('should move the positioned edges of a normal box', function() {
    setupNormal();

    box.moveEdges(50, 50, 'nw');
    box.render(el.style);

    assert.equal(el.style.left,   '150px');
    assert.equal(el.style.top,    '150px');
    assert.equal(el.style.width,  '50px');
    assert.equal(el.style.height, '50px');
    assert.equal(el.style.right,  '');
    assert.equal(el.style.bottom, '');
  });

  it('should move the positioned edges of an inverted box', function() {
    setupInverted();

    box.moveEdges(-50, -50, 'se');
    box.render(el.style);

    assert.equal(el.style.left,   '');
    assert.equal(el.style.top,    '');
    assert.equal(el.style.width,  '50px');
    assert.equal(el.style.height, '50px');
    assert.equal(el.style.right,  '150px');
    assert.equal(el.style.bottom, '150px');
  });

  it('should ensure that normal boxes cannot move opposite edges into negative values', function() {
    setupNormal();

    box.moveEdges(-150, -200, 'se');
    box.render(el.style);

    assert.equal(el.style.left,   '50px');
    assert.equal(el.style.top,    '0px');
    assert.equal(el.style.width,  '50px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.right,  '');
    assert.equal(el.style.bottom, '');
  });

  it('should ensure that inverted boxes cannot move opposite edges into negative values', function() {
    setupInverted();

    box.moveEdges(150, 200, 'nw');
    box.render(el.style);

    assert.equal(el.style.left,   '');
    assert.equal(el.style.top,    '');
    assert.equal(el.style.width,  '50px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.right,  '50px');
    assert.equal(el.style.bottom, '0px');
  });

  it('should ensure that normal boxes cannot move positioned edges into negative values', function() {
    setupNormal();

    box.moveEdges(150, 150, 'nw');
    box.render(el.style);

    assert.equal(el.style.left,   '200px');
    assert.equal(el.style.top,    '200px');
    assert.equal(el.style.width,  '50px');
    assert.equal(el.style.height, '50px');
    assert.equal(el.style.right,  '');
    assert.equal(el.style.bottom, '');
  });

  it('should ensure that inverted boxes cannot move positioned edges into negative values', function() {
    setupInverted();

    box.moveEdges(-150, -150, 'se');
    box.render(el.style);

    assert.equal(el.style.left,   '');
    assert.equal(el.style.top,    '');
    assert.equal(el.style.width,  '50px');
    assert.equal(el.style.height, '50px');
    assert.equal(el.style.right,  '200px');
    assert.equal(el.style.bottom, '200px');
  });

  it('should be able to clone itself', function() {
    setupNormal();
    var clone = box.clone();
    assert.equal(clone.cssH.px,      100);
    assert.equal(clone.cssV.px,      100);
    assert.equal(clone.cssWidth.px,  100);
    assert.equal(clone.cssHeight.px, 100);
  });

  it('should get its ratio', function() {
    el = createDiv();
    el.style.left   = '40px';
    el.style.top    = '30px';
    el.style.width  = '100px';
    el.style.height = '50px';
    box = CSSBox.fromElement(el);
    assert.equal(box.getRatio(), 2);
  });

  it('should get the ratio of an inverted box', function() {
    el = appendInvertedBox();
    el.style.width  = '120px';
    el.style.height = '40px';
    box = CSSBox.fromElement(el);
    assert.equal(box.getRatio(), 3);
  });

  it('should not fail to get the ratio when the dimensions are 0', function() {
    el = appendInvertedBox();
    el.style.width  = '0px';
    el.style.height = '0px';
    box = CSSBox.fromElement(el);
    assert.equal(box.getRatio(), 0);
  });

  it('should not move any edges', function() {
    setupPixel(100, 100, 0, 0);
    box.moveEdges(0, 0, 'right', 'bottom');
    box.render(el.style);

    assert.equal(el.style.width,  '0px');
    assert.equal(el.style.height, '0px');

  });

  it('should get its position header', function() {
    var box = CSSBox.fromPixelValues(100, 100, 150, 150)
    assert.equal(box.getPositionHeader(), '100px, 100px');
    assert.equal(box.getDimensionsHeader(), '150px, 150px');
  });

  // --- CSS Declarations

  it('should append its CSS declarations', function() {
    var box = CSSBox.fromPixelValues(100, 100, 150, 150), decs = [];
    box.appendCSSDeclarations(decs);
    assert.equal(decs[0], 'top: 100px;');
    assert.equal(decs[1], 'left: 100px;');
    assert.equal(decs[2], 'width: 150px;');
    assert.equal(decs[3], 'height: 150px;');
  });

});
