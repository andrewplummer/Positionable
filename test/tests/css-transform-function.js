
describe('CSSTransformFunction', function() {

  teardown(function() {
    releaseAppendedFixtures();
  });

  function getTransformFunction(className) {
    var el, prop, transform, match, name, values;
    el = appendBox(className);
    prop = new CSSRuleMatcher(el).getProperty('transform');
    transform = prop.getValue();
    if (transform) {
      match  = transform.match(/(\w+)\((.+)\)/);
      name   = match[1];
      values = match[2];
    } else {
      name = '';
      values = '';
    }
    return CSSTransformFunction.create(name, values, prop, el);
  }

  function assertIdentity(className, expected) {
    assertEqual(getTransformFunction(className).toString(), expected || name + '(' + values + ')');
  }

  function assertHeader(className, expected) {
    assertEqual(getTransformFunction(className).getHeader(), expected);
  }

  function assertMutate(className, expected) {
    assertEqual(getTransformFunction(className).canMutate, expected);
  }

  function assertTranslate(className, expected) {
    assertEqual(getTransformFunction(className).isTranslate(), expected);
  }

  function assertZRotate(className, expected) {
    assertEqual(getTransformFunction(className).isZRotate(), expected);
  }

  function assertMatrix(className, expected) {
    assertEqual(getTransformFunction(className).isMatrix(), expected);
  }

  function assertSetTranslation(className, x, y, expected) {
    var func = getTransformFunction(className);
    func.values[0].px = x;
    func.values[1].px = y;
    assertEqual(func.toString(), expected);
  }

  it('should handle percent values in translate as a function of element', function() {
    assertSetTranslation('big-box translate-percent-box', 40, 50, 'translate(20%, 25%)');
  });

  it('should be able to clone mutating functions', function() {
    var func = getTransformFunction('rotate-box', '45deg').clone();
    assertEqual(func.toString(), 'rotate(45deg)');
  });

  it('should be able to clone static functions', function() {
    var func = getTransformFunction('scale-box').clone();
    assertEqual(func.toString(), 'scale(2, 3)');
  });

  it('should be able to create', function() {
    assertIdentity('skew-box',        'skew(20deg, 20deg)');
    assertIdentity('skew-x-box',      'skewX(20deg)');
    assertIdentity('skew-y-box',      'skewY(20deg)');
    assertIdentity('skew-single-box', 'skew(20deg)');

    assertIdentity('translate-box',    'translate(20px, 30px)');
    assertIdentity('translate-x-box',  'translateX(20px)');
    assertIdentity('translate-y-box',  'translateY(30px)');
    assertIdentity('translate-z-box',  'translateZ(40px)');
    assertIdentity('translate-3d-box', 'translate3d(20px, 30px, 40px)');

    assertIdentity('scale-box',        'scale(2, 3)');
    assertIdentity('scale-x-box',      'scaleX(2)');
    assertIdentity('scale-y-box',      'scaleY(2)');
    assertIdentity('scale-z-box',      'scaleZ(2)');
    assertIdentity('scale-3d-box',     'scale3d(2, 3, 4)');
    assertIdentity('scale-single-box', 'scale(2)');

    assertIdentity('rotate-box',    'rotate(45deg)');
    assertIdentity('rotate-x-box',  'rotateX(45deg)');
    assertIdentity('rotate-y-box',  'rotateY(45deg)');
    assertIdentity('rotate-z-box',  'rotateZ(45deg)');
    assertIdentity('rotate-3d-box', 'rotate3d(1, 2, 3, 45deg)');

    assertIdentity('matrix-box'   , 'matrix(1, 0, 0, 1, 0, 0)');
    assertIdentity('matrix-3d-box', 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');

    assertIdentity('perspective-box', 'perspective(500px)');

    // Single values on translate
    assertIdentity('translate-single-box',         'translate(20px, 0px)');
    assertIdentity('translate-single-percent-box', 'translate(20%, 0px)');
  });

  it('should get abbreviated headers for rotation and translation', function() {
    assertHeader('rotate-box', 'r: 45deg');
    assertHeader('translate-box', 't: 20px, 30px');
  });

  it('should get abbreviated headers for others', function() {
    assertHeader('skew-single-box', 'skew: 20deg');
    assertHeader('translate-x-box', 'translateX: 20px');
    assertHeader('translate-y-box', 'translateY: 30px');
    assertHeader('matrix-box', 'matrix: 1,0,0,1,0,0');
  });

  it('should report whether it can mutate', function() {
    assertMutate('skew-box',             false);
    assertMutate('skew-x-box',           false);
    assertMutate('skew-y-box',           false);
    assertMutate('skew-single-box',      false);
    assertMutate('translate-box',        true);
    assertMutate('translate-x-box',      false);
    assertMutate('translate-y-box',      false);
    assertMutate('translate-z-box',      false);
    assertMutate('translate-3d-box',     true);
    assertMutate('translate-single-box', true);
    assertMutate('scale-box',            false);
    assertMutate('scale-3d-box',         false);
    assertMutate('scale-x-box',          false);
    assertMutate('scale-y-box',          false);
    assertMutate('scale-z-box',          false);
    assertMutate('scale-single-box',     false);
    assertMutate('rotate-box',           true);
    assertMutate('rotate-x-box',         false);
    assertMutate('rotate-y-box',         false);
    assertMutate('rotate-z-box',         true);
    assertMutate('rotate-3d-box',        false);
    assertMutate('perspective-box',      false);
    assertMutate('matrix-box',           false);
    assertMutate('matrix-3d-box',        false);
  });

  it('should report whether it is translate', function() {
    assertTranslate('skew-box',             false);
    assertTranslate('skew-x-box',           false);
    assertTranslate('skew-y-box',           false);
    assertTranslate('skew-single-box',      false);
    assertTranslate('translate-box',        true);
    assertTranslate('translate-x-box',      false);
    assertTranslate('translate-y-box',      false);
    assertTranslate('translate-z-box',      false);
    assertTranslate('translate-3d-box',     true);
    assertTranslate('translate-single-box', true);
    assertTranslate('scale-box',            false);
    assertTranslate('scale-3d-box',         false);
    assertTranslate('scale-x-box',          false);
    assertTranslate('scale-y-box',          false);
    assertTranslate('scale-z-box',          false);
    assertTranslate('scale-single-box',     false);
    assertTranslate('rotate-box',           false);
    assertTranslate('rotate-x-box',         false);
    assertTranslate('rotate-y-box',         false);
    assertTranslate('rotate-z-box',         false);
    assertTranslate('rotate-3d-box',        false);
    assertTranslate('perspective-box',      false);
    assertTranslate('matrix-box',           false);
    assertTranslate('matrix-3d-box',        false);
  });

  it('should report whether it is z rotation', function() {
    assertZRotate('skew-box',             false);
    assertZRotate('skew-x-box',           false);
    assertZRotate('skew-y-box',           false);
    assertZRotate('skew-single-box',      false);
    assertZRotate('translate-box',        false);
    assertZRotate('translate-x-box',      false);
    assertZRotate('translate-y-box',      false);
    assertZRotate('translate-z-box',      false);
    assertZRotate('translate-3d-box',     false);
    assertZRotate('translate-single-box', false);
    assertZRotate('scale-box',            false);
    assertZRotate('scale-3d-box',         false);
    assertZRotate('scale-x-box',          false);
    assertZRotate('scale-y-box',          false);
    assertZRotate('scale-z-box',          false);
    assertZRotate('scale-single-box',     false);
    assertZRotate('rotate-box',           true);
    assertZRotate('rotate-x-box',         false);
    assertZRotate('rotate-y-box',         false);
    assertZRotate('rotate-z-box',         true);
    assertZRotate('rotate-3d-box',        false);
    assertZRotate('perspective-box',      false);
    assertZRotate('matrix-box',           false);
    assertZRotate('matrix-3d-box',        false);
  });

  it('should report whether it is a matrix transform', function() {
    assertMatrix('skew-box',             false);
    assertMatrix('skew-x-box',           false);
    assertMatrix('skew-y-box',           false);
    assertMatrix('skew-single-box',      false);
    assertMatrix('translate-box',        false);
    assertMatrix('translate-x-box',      false);
    assertMatrix('translate-y-box',      false);
    assertMatrix('translate-z-box',      false);
    assertMatrix('translate-3d-box',     false);
    assertMatrix('translate-single-box', false);
    assertMatrix('scale-box',            false);
    assertMatrix('scale-3d-box',         false);
    assertMatrix('scale-x-box',          false);
    assertMatrix('scale-y-box',          false);
    assertMatrix('scale-z-box',          false);
    assertMatrix('scale-single-box',     false);
    assertMatrix('rotate-box',           false);
    assertMatrix('rotate-x-box',         false);
    assertMatrix('rotate-y-box',         false);
    assertMatrix('rotate-z-box',         false);
    assertMatrix('rotate-3d-box',        false);
    assertMatrix('perspective-box',      false);
    assertMatrix('matrix-box',           true);
    assertMatrix('matrix-3d-box',        true);
  });

  it('should correctly report if it has percent translation', function() {
    assertEqual(getTransformFunction('translate-box').hasPercentTranslation(), false);
    assertEqual(getTransformFunction('translate-percent-box').hasPercentTranslation(), true);
  });

});
