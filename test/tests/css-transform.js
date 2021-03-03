
describe('CSSTransform', function() {

  var el;

  teardown(function() {
    releaseAppendedFixtures();
  });

  function getTransform(className) {
    el = appendBox(className);
    return CSSTransform.fromMatcher(new CSSRuleMatcher(el));
  }

  function assertIdentity(className, expected) {
    assertEqual(getTransform(className).toString(), expected);
  }

  function assertOrigin(className, x, y) {
    var origin = getTransform(className).getOrigin();
    assertEqual(origin.x, x);
    assertEqual(origin.y, y);
  }

  function assertGetRotation(className, expected) {
    assertEqual(getTransform(className).getRotation(), expected);
  }

  function assertSetRotation(className, rotation, expected) {
    var transform = getTransform(className);
    transform.setRotation(rotation);
    assertEqual(transform.toString(), expected);
  }

  function assertGetTranslation(className, x, y) {
    var p = getTransform(className).getTranslation();
    assertEqual(p.x, x);
    assertEqual(p.y, y);
  }

  function assertSetTranslation(className, x, y, expected) {
    var transform = getTransform(className);
    transform.setTranslation(new Point(x, y));
    assertEqual(transform.toString(), expected);
  }

  function assertAddTranslation(className, x, y, expected) {
    var transform = getTransform(className);
    transform.addTranslation(new Point(x, y));
    assertEqual(transform.toString(), expected);
  }

  it('should export correct headers', function() {
    var transform = getTransform('rotate-translate-box');
    assertEqual(transform.getHeader(), 'r: 45deg | t: 20px, 30px');
  });

  it('should correctly identify element transforms', function() {
    assertIdentity('none', '');

    assertIdentity('translate-box',   'translate(20px, 30px)');
    assertIdentity('translate-x-box', 'translateX(20px)');
    assertIdentity('translate-y-box', 'translateY(30px)');
    assertIdentity('translate-z-box', 'translateZ(40px)');
    assertIdentity('rotate-box',      'rotate(45deg)');
    assertIdentity('rotate-3d-box',   'rotate3d(1, 2, 3, 45deg)');
    assertIdentity('rotate-x-box',    'rotateX(45deg)');
    assertIdentity('rotate-y-box',    'rotateY(45deg)');
    assertIdentity('rotate-z-box',    'rotateZ(45deg)');
    assertIdentity('scale-box',       'scale(2, 3)');
    assertIdentity('scale-x-box',     'scaleX(2)');
    assertIdentity('scale-y-box',     'scaleY(2)');
    assertIdentity('scale-z-box',     'scaleZ(2)');
    assertIdentity('skew-box',        'skew(20deg, 20deg)');
    assertIdentity('skew-x-box',      'skewX(20deg)');
    assertIdentity('skew-y-box',      'skewY(20deg)');
    assertIdentity('perspective-box', 'perspective(500px)');
    assertIdentity('matrix-box',      'matrix(1, 0, 0, 1, 0, 0)');
    assertIdentity('matrix-3d-box',   'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');
  });

  it('should append its CSS declarations', function() {
    var transform = getTransform('rotate-translate-box'), decs = [];
    transform.appendCSSDeclaration(decs);
    assertEqual(decs.length, 1);
    assertEqual(decs[0], 'transform: rotate(45deg) translate(20px, 30px);');
  });

  it('should be able to clone itself', function() {
    var transform = getTransform('rotate-translate-box').clone();
    assertEqual(transform.toString(), 'rotate(45deg) translate(20px, 30px)');
  });

  it('should be able to get the origin', function() {
    assertOrigin('rotate-tl-box',    0,   0);
    assertOrigin('rotate-tr-box',    100, 0);
    assertOrigin('rotate-bl-box',    0,   100);
    assertOrigin('rotate-br-box',    100, 100);
    assertOrigin('rotate-fixed-box', 20,  30);
  });

  it('should be able to get the rotation', function() {
    assertGetRotation('rotate-box',   45);
    assertGetRotation('rotate-x-box', 0);
    assertGetRotation('rotate-y-box', 0);
    assertGetRotation('rotate-z-box', 45);
    assertGetRotation('translate-box',        0);
    assertGetRotation('translate-x-box',      0);
    assertGetRotation('translate-y-box',      0);
    assertGetRotation('translate-z-box',      0);
    assertGetRotation('translate-single-box', 0);
    assertGetRotation('matrix-box',    0);
    assertGetRotation('matrix-3d-box', 0);
  });

  it('should be able to set the rotation', function() {
    assertSetRotation('rotate-box',      90, 'rotate(90deg)');
    assertSetRotation('rotate-x-box',    90, 'rotateX(45deg) rotate(90deg)');
    assertSetRotation('rotate-y-box',    90, 'rotateY(45deg) rotate(90deg)');
    assertSetRotation('rotate-z-box',    90, 'rotateZ(90deg)');
    assertSetRotation('translate-x-box', 90, 'translateX(20px) rotate(90deg)');
    assertSetRotation('translate-y-box', 90, 'translateY(30px) rotate(90deg)');
    assertSetRotation('translate-z-box', 90, 'translateZ(40px) rotate(90deg)');
    assertSetRotation('translate-box',   90, 'translate(20px, 30px) rotate(90deg)');
    assertSetRotation('matrix-box',      90, 'matrix(1, 0, 0, 1, 0, 0) rotate(90deg)');
    assertSetRotation('matrix-3d-box',   90, 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1) rotate(90deg)');
  });

  it('should be able to get the translation', function() {
    assertGetTranslation('rotate-box',       0, 0);
    assertGetTranslation('rotate-x-box',     0, 0);
    assertGetTranslation('rotate-y-box',     0, 0);
    assertGetTranslation('rotate-z-box',     0, 0);
    assertGetTranslation('translate-x-box',  0, 0);
    assertGetTranslation('translate-y-box',  0, 0);
    assertGetTranslation('translate-z-box',  0, 0);
    assertGetTranslation('translate-box',    20, 30);
    assertGetTranslation('translate-3d-box', 20, 30);
    assertGetTranslation('matrix-box',       0, 0);
    assertGetTranslation('matrix-3d-box',    0, 0);
  });

  it('should be able to set the translation', function() {
    assertSetTranslation('rotate-box',       40, 40, 'translate(40px, 40px) rotate(45deg)');
    assertSetTranslation('rotate-x-box',     40, 40, 'translate(40px, 40px) rotateX(45deg)');
    assertSetTranslation('rotate-y-box',     40, 40, 'translate(40px, 40px) rotateY(45deg)');
    assertSetTranslation('rotate-z-box',     40, 40, 'translate(40px, 40px) rotateZ(45deg)');
    assertSetTranslation('translate-x-box',  40, 40, 'translate(40px, 40px) translateX(20px)');
    assertSetTranslation('translate-y-box',  40, 40, 'translate(40px, 40px) translateY(30px)');
    assertSetTranslation('translate-z-box',  40, 40, 'translate(40px, 40px) translateZ(40px)');
    assertSetTranslation('translate-box',    40, 40, 'translate(40px, 40px)');
    assertSetTranslation('translate-3d-box', 40, 40, 'translate3d(40px, 40px, 40px)');
    assertSetTranslation('matrix-box',       40, 40, 'translate(40px, 40px) matrix(1, 0, 0, 1, 0, 0)');
    assertSetTranslation('matrix-3d-box',    40, 40, 'translate(40px, 40px) matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');

    // Single value implies no translation
    assertSetTranslation('translate-single-box', 40, 40, 'translate(40px, 40px)');
  });

  it('should be able to add translation', function() {
    assertAddTranslation('rotate-box',       40, 40, 'translate(40px, 40px) rotate(45deg)');
    assertAddTranslation('rotate-x-box',     40, 40, 'translate(40px, 40px) rotateX(45deg)');
    assertAddTranslation('rotate-y-box',     40, 40, 'translate(40px, 40px) rotateY(45deg)');
    assertAddTranslation('rotate-z-box',     40, 40, 'translate(40px, 40px) rotateZ(45deg)');
    assertAddTranslation('translate-x-box',  40, 40, 'translate(40px, 40px) translateX(20px)');
    assertAddTranslation('translate-y-box',  40, 40, 'translate(40px, 40px) translateY(30px)');
    assertAddTranslation('translate-z-box',  40, 40, 'translate(40px, 40px) translateZ(40px)');
    assertAddTranslation('translate-box',    40, 40, 'translate(60px, 70px)');
    assertAddTranslation('translate-3d-box', 40, 40, 'translate3d(60px, 70px, 40px)');
    assertAddTranslation('matrix-box',       40, 40, 'translate(40px, 40px) matrix(1, 0, 0, 1, 0, 0)');
    assertAddTranslation('matrix-3d-box',    40, 40, 'translate(40px, 40px) matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');

    // Single value implies no translation
    assertAddTranslation('translate-single-box', 40, 40, 'translate(60px, 40px)');
  });

  it('should prepend translation function on null', function() {
    var transform = getTransform();
    transform.setTranslation(new Point(10, 10));
    assertEqual(transform.functions.length, 1);
  });

  it('should prepend translation function on rotated', function() {
    var transform = getTransform('rotate-box');
    transform.setTranslation(new Point(10, 10));
    assertEqual(transform.functions.length, 2);
  });

  it('should not prepend translation function on translated', function() {
    var transform = getTransform('translate-box');
    transform.setTranslation(new Point(10, 10));
    assertEqual(transform.functions.length, 1);
  });

  it('should prepend translation when rotate preceeds translate', function() {
    var transform = getTransform('rotate-translate-box');
    transform.setTranslation(new Point(10, 10));
    assertEqual(transform.functions.length, 3);
  });

  it('should prepend translation on multiple with rotate before translate', function() {
    var transform = getTransform('rotate-translate-box');
    transform.setTranslation(new Point(10, 10));
    assertEqual(transform.functions.length, 3);
  });

  it('should not prepend translation on multiple with translate before rotate', function() {
    var transform = getTransform('translate-rotate-box');
    transform.setTranslation(new Point(10, 10));
    assertEqual(transform.functions.length, 2);
  });

  it('should allow reporting when the dimensions have changed and get the updated origin', function() {
    var transform = getTransform(), origin;

    origin = transform.getOrigin();
    assertEqual(origin.x, 50);
    assertEqual(origin.y, 50);

    el.style.width  = '200px';
    el.style.height = '200px';
    transform.update();

    origin = transform.getOrigin();
    assertEqual(origin.x, 100);
    assertEqual(origin.y, 100);

  });

  it('should correctly report if it has percent translation', function() {
    assertEqual(getTransform().hasPercentTranslation(), false);
    assertEqual(getTransform('translate-percent-box').hasPercentTranslation(), true);
  });

});
