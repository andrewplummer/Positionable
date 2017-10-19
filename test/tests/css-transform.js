
describe('CSSTransform', function(uiRoot) {

  var el;

  teardown(function() {
    releaseAppendedFixtures();
  });

  function getTransform(transform, transformOrigin, el) {
    // Prevent percent default value so that we don't have to
    // construct elements for assertions that don't need them.
    return CSSTransform.create(transform, transformOrigin || '0px 0px', el);
  }

  function getElementTransform(className) {
    el = appendAbsoluteBox(className);
    var matcher = new CSSRuleMatcher(el);
    var tString = matcher.getMatchedProperty('transform');
    var oString = matcher.getMatchedProperty('transformOrigin');
    return CSSTransform.create(tString, oString, el);
  }

  function assertIdentity(transform) {
    assert.equal(getTransform(transform).toString(), transform);
  }

  function assertOrigin(transform, transformOrigin, x, y) {
    var origin = getTransform(transform, transformOrigin).getOrigin();
    assert.equal(origin.x, x);
    assert.equal(origin.y, y);
  }

  function assertGetRotation(transform, rotation) {
    assert.equal(getTransform(transform).getRotation(), rotation);
  }

  function assertSetRotation(transform, rotation, expected) {
    var transform = getTransform(transform);
    transform.setRotation(rotation);
    assert.equal(transform.toString(), expected);
  }

  function assertGetTranslation(transform, x, y) {
    var p = getTransform(transform).getTranslation();
    assert.equal(p.x, x);
    assert.equal(p.y, y);
  }

  function assertSetTranslation(transform, x, y, expected, el) {
    var transform = getTransform(transform, null, el);
    transform.setTranslation(new Point(x, y));
    assert.equal(transform.toString(), expected);
  }

  function assertAddTranslation(transform, x, y, expected, el) {
    var transform = getTransform(transform, null, el);
    transform.addTranslation(new Point(x, y));
    assert.equal(transform.toString(), expected);
  }

  function assertElementTransform(className, expected) {
    assert.equal(getElementTransform(className).toString(), expected);
  }

  it('should export correct headers', function() {
    var transform = getTransform('rotate(45deg) scale(2, 4) skew(5deg, 45deg) translate(20px, 30px)');
    assert.equal(transform.getHeader(), 'r: 45deg | scale: 2, 4 | skew: 5deg, 45deg | t: 20px, 30px');
  });

  it('should be able to create basic transform types', function() {
    assertIdentity('translate(20px, 20px)');
    assertIdentity('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');
    assertIdentity('matrix(1, 0, 0, 1, 0, 0)');
  });

  it('should append its CSS declarations', function() {
    var transform = getTransform('rotate(45deg) scale(2, 4)'), decs = [];
    transform.appendCSSDeclaration(decs);
    assert.equal(decs.length, 1);
    assert.equal(decs[0], 'transform: rotate(45deg) scale(2, 4);');
  });

  it('should be able to clone itself', function() {
    var transform = getTransform('rotate(45deg) scale(2, 4)').clone();
    assert.equal(transform.toString(), 'rotate(45deg) scale(2, 4)');
  });

  it('should be able to get the origin', function() {
    assertOrigin('translate(20px, 20px)', '10px 10px', 10, 10);
    assertOrigin('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)', '20px 20px', 20, 20);
    assertOrigin('matrix(1,0,0,1,0,0)', '30px 30px', 30, 30);
  });

  it('should be able to get the rotation', function() {
    assertGetRotation('rotate(45deg)',  45);
    assertGetRotation('rotateX(45deg)', 0);
    assertGetRotation('rotateY(45deg)', 0);
    assertGetRotation('rotateZ(45deg)', 45);
    assertGetRotation('translateX(20px)',      0);
    assertGetRotation('translateY(20px)',      0);
    assertGetRotation('translateZ(20px)',      0);
    assertGetRotation('translate(20px, 20px)', 0);
    assertGetRotation('matrix(1,0,0,1,0,0)', 0);
    assertGetRotation('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)', 0);
  });

  it('should be able to set the rotation', function() {
    assertSetRotation('rotate(45deg)',  90, 'rotate(90deg)');
    assertSetRotation('rotateX(45deg)', 90, 'rotateX(45deg) rotate(90deg)');
    assertSetRotation('rotateY(45deg)', 90, 'rotateY(45deg) rotate(90deg)');
    assertSetRotation('rotateZ(45deg)', 90, 'rotateZ(90deg)');
    assertSetRotation('translateX(20px)', 90, 'translateX(20px) rotate(90deg)');
    assertSetRotation('translateY(20px)', 90, 'translateY(20px) rotate(90deg)');
    assertSetRotation('translateZ(20px)', 90, 'translateZ(20px) rotate(90deg)');
    assertSetRotation('translate(20px, 20px)', 90, 'translate(20px, 20px) rotate(90deg)');
    assertSetRotation('matrix(1,0,0,1,0,0)',  90, 'matrix(1, 0, 0, 1, 0, 0) rotate(90deg)');
    assertSetRotation('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)', 90, 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1) rotate(90deg)');
  });

  it('should be able to get the translation', function() {
    assertGetTranslation('rotate(45deg)',  0, 0);
    assertGetTranslation('rotateX(45deg)', 0, 0);
    assertGetTranslation('rotateY(45deg)', 0, 0);
    assertGetTranslation('rotateZ(45deg)', 0, 0);
    assertGetTranslation('translateX(20px)', 0, 0);
    assertGetTranslation('translateY(20px)', 0, 0);
    assertGetTranslation('translateZ(20px)', 0, 0);
    assertGetTranslation('translate(20px, 20px)', 20, 20);
    assertGetTranslation('translate3d(20px, 20px)', 20, 20);
    assertGetTranslation('matrix(1,0,0,1,0,0)', 0, 0);
    assertGetTranslation('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)', 0, 0);
  });

  it('should be able to set the translation', function() {
    assertSetTranslation('rotate(45deg)',  40, 40, 'translate(40px, 40px) rotate(45deg)');
    assertSetTranslation('rotateX(45deg)', 40, 40, 'translate(40px, 40px) rotateX(45deg)');
    assertSetTranslation('rotateY(45deg)', 40, 40, 'translate(40px, 40px) rotateY(45deg)');
    assertSetTranslation('rotateZ(45deg)', 40, 40, 'translate(40px, 40px) rotateZ(45deg)');
    assertSetTranslation('translateX(20px)', 40, 40, 'translate(40px, 40px) translateX(20px)');
    assertSetTranslation('translateY(20px)', 40, 40, 'translate(40px, 40px) translateY(20px)');
    assertSetTranslation('translateZ(20px)', 40, 40, 'translate(40px, 40px) translateZ(20px)');
    assertSetTranslation('translate(20px, 20px)', 40, 40, 'translate(40px, 40px)');
    assertSetTranslation('translate3d(20px, 20px, 20px)', 40, 40, 'translate3d(40px, 40px, 20px)');
    assertSetTranslation('matrix(1,0,0,1,0,0)', 40, 40, 'translate(40px, 40px) matrix(1, 0, 0, 1, 0, 0)');
    assertSetTranslation('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)', 40, 40, 'translate(40px, 40px) matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');

    // Single value implies no translation
    assertSetTranslation('translate(20px)', 40, 40, 'translate(40px, 40px)', appendAbsoluteBox());
  });

  it('should be able to add translation', function() {
    assertAddTranslation('rotate(45deg)',  40, 40, 'translate(40px, 40px) rotate(45deg)');
    assertAddTranslation('rotateX(45deg)', 40, 40, 'translate(40px, 40px) rotateX(45deg)');
    assertAddTranslation('rotateY(45deg)', 40, 40, 'translate(40px, 40px) rotateY(45deg)');
    assertAddTranslation('rotateZ(45deg)', 40, 40, 'translate(40px, 40px) rotateZ(45deg)');
    assertAddTranslation('translateX(20px)', 40, 40, 'translate(40px, 40px) translateX(20px)');
    assertAddTranslation('translateY(20px)', 40, 40, 'translate(40px, 40px) translateY(20px)');
    assertAddTranslation('translateZ(20px)', 40, 40, 'translate(40px, 40px) translateZ(20px)');
    assertAddTranslation('translate(20px, 20px)', 40, 40, 'translate(60px, 60px)');
    assertAddTranslation('translate3d(20px, 20px, 20px)', 40, 40, 'translate3d(60px, 60px, 20px)');
    assertAddTranslation('matrix(1,0,0,1,0,0)', 40, 40, 'translate(40px, 40px) matrix(1, 0, 0, 1, 0, 0)');
    assertAddTranslation('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)', 40, 40, 'translate(40px, 40px) matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');

    // Single value implies no translation
    assertAddTranslation('translate(20px)', 40, 40, 'translate(60px, 40px)', appendAbsoluteBox());
  });

  it('should prepend translation function on null', function() {
    var transform = getTransform();
    transform.setTranslation(new Point(10, 10));
    assert.equal(transform.functions.length, 1);
  });

  it('should prepend translation function on rotated', function() {
    var transform = getTransform('rotate(45deg)');
    transform.setTranslation(new Point(10, 10));
    assert.equal(transform.functions.length, 2);
  });

  it('should not prepend translation function on translated', function() {
    var transform = getTransform('translate(20px, 20px)');
    transform.setTranslation(new Point(10, 10));
    assert.equal(transform.functions.length, 1);
  });

  it('should prepend translation when rotate preceeds translate', function() {
    var transform = getTransform('rotate(45deg) translate(20px, 20px)');
    transform.setTranslation(new Point(10, 10));
    assert.equal(transform.functions.length, 3);
  });

  it('should prepend translation on multiple with rotate before translate', function() {
    var transform = getTransform('scale(2, 2) skew(5deg, 45deg) rotate(45deg) translate(20px, 20px)');
    transform.setTranslation(new Point(10, 10));
    assert.equal(transform.functions.length, 5);
  });

  it('should not prepend translation on multiple with translate before rotate', function() {
    var transform = getTransform('translate(10px, 10px) rotate(45deg) scale(2, 2) skew(5deg, 45deg) translate(20px, 20px)');
    transform.setTranslation(new Point(10, 10));
    assert.equal(transform.functions.length, 5);
  });

  it('should correctly identify transform elements', function() {
    assertElementTransform('none', '');
    assertElementTransform('translate-box', 'translate(20px, 30px)');
    assertElementTransform('translate-x-box', 'translateX(20px)');
    assertElementTransform('translate-y-box', 'translateY(20px)');
    assertElementTransform('translate-z-box', 'translateZ(20px)');
    assertElementTransform('rotate-box', 'rotate(45deg)');
    assertElementTransform('rotate-3d-box', 'rotate3d(1, 2, 3, 20deg)');
    assertElementTransform('rotate-x-box', 'rotateX(20deg)');
    assertElementTransform('rotate-y-box', 'rotateY(20deg)');
    assertElementTransform('rotate-z-box', 'rotateZ(20deg)');
    assertElementTransform('scale-box', 'scale(2, 3)');
    assertElementTransform('scale-x-box', 'scaleX(2)');
    assertElementTransform('scale-y-box', 'scaleY(2)');
    assertElementTransform('scale-z-box', 'scaleZ(2)');
    assertElementTransform('skew-box', 'skew(20deg, 20deg)');
    assertElementTransform('skew-x-box', 'skewX(20deg)');
    assertElementTransform('skew-y-box', 'skewY(20deg)');
    assertElementTransform('perspective-box', 'perspective(500px)');
  });

  it('should allow reporting when the dimensions have changed and get the updated origin', function() {
    var transform = getElementTransform(), origin;

    origin = transform.getOrigin();
    assert.equal(origin.x, 50);
    assert.equal(origin.y, 50);

    el.style.width  = '200px';
    el.style.height = '200px';
    transform.update();

    origin = transform.getOrigin();
    assert.equal(origin.x, 100);
    assert.equal(origin.y, 100);

  });

  it('should correctly report if it has percent translation', function() {
    assert.equal(getElementTransform().hasPercentTranslation(), false);
    assert.equal(getElementTransform('translate-percent-box').hasPercentTranslation(), true);
  });

});
