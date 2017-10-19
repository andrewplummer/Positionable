
describe('CSSTransformFunction', function(uiRoot) {

  function getTransformFunction(prop, values, el) {
    return CSSTransformFunction.create(prop, values, el);
  }

  function getElementTransformFunction(className) {
    var el, matcher, transform, all, prop, values;
    el        = appendAbsoluteBox(className);
    matcher   = new CSSRuleMatcher(el);
    transform = matcher.getMatchedProperty('transform');
    if (transform) {
      [all, prop, values] = transform.match(/(\w+)\((.+)\)/);
    } else {
      prop = '';
      values = '';
    }
    return getTransformFunction(prop, values, el);
  }

  function assertIdentity(prop, values, expected) {
    assert.equal(getTransformFunction(prop, values).toString(), expected || prop + '(' + values + ')');
  }

  function assertHeader(prop, values, expected) {
    assert.equal(getTransformFunction(prop, values).getHeader(), expected);
  }

  function assertMutate(prop, values, expected) {
    assert.equal(getTransformFunction(prop, values).canMutate, expected);
  }

  function assertTranslate(prop, values, expected) {
    assert.equal(getTransformFunction(prop, values).isTranslate(), expected);
  }

  function assertZRotate(prop, values, expected) {
    assert.equal(getTransformFunction(prop, values).isZRotate(), expected);
  }

  function assertMatrix(prop, values, expected) {
    assert.equal(getTransformFunction(prop, values).isMatrix(), expected);
  }

  function assertSetElementTranslation(className, x, y, expected) {
    var func = getElementTransformFunction(className);
    func.values[0].px = x;
    func.values[1].px = y;
    assert.equal(func.toString(), expected);
  }

  it('should handle percent values in translate as a function of element', function() {
    assertSetElementTranslation('big-box translate-percent-box', 40, 50, 'translate(20%, 25%)');
  });

  it('should be able to clone mutating properties', function() {
    var func = getTransformFunction('rotate', '45deg').clone();
    assert.equal(func.toString(), 'rotate(45deg)');
  });

  it('should be able to clone static properties', function() {
    var func = getTransformFunction('scale', '2, 2').clone();
    assert.equal(func.toString(), 'scale(2, 2)');
  });

  it('should be able to create', function() {
    assertIdentity('skew', '10deg');
    assertIdentity('skew', '10deg, 10deg');
    assertIdentity('skewX', '10deg');
    assertIdentity('skewY', '10deg');
    assertIdentity('translate', '20px, 20px');
    assertIdentity('translateX', '20px');
    assertIdentity('translateY', '20px');
    assertIdentity('translateZ', '20px');
    assertIdentity('translate3d', '20px, 20px, 20px');
    assertIdentity('scale', '2');
    assertIdentity('scale', '2, 2');
    assertIdentity('scale3d', '2, 2, 2');
    assertIdentity('scaleX', '2');
    assertIdentity('scaleY', '2');
    assertIdentity('scaleZ', '2');
    assertIdentity('rotate', '10deg');
    assertIdentity('rotateX', '10deg');
    assertIdentity('rotateY', '10deg');
    assertIdentity('rotateZ', '10deg');
    assertIdentity('rotate3d', '2, 2, 2, 10deg');
    assertIdentity('matrix', '1, 0, 0, 1, 0, 0');
    assertIdentity('matrix3d', '1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1');
    assertIdentity('perspective', '10px');

    // Single values on translate
    assertIdentity('translate', '20px', 'translate(20px, 0px)');
    assertIdentity('translate', '10%', 'translate(10%, 0px)');
  });

  it('should handle no space between commas', function() {
    assertIdentity('translate3d', '20px,20px,20px', 'translate3d(20px, 20px, 20px)');
  });

  it('should get abbreviated headers for rotation and translation', function() {
    assertHeader('rotate', '20deg', 'r: 20deg');
    assertHeader('translate', '20px, 20px', 't: 20px, 20px');
  });

  it('should get abbreviated headers for others', function() {
    assertHeader('skew', '20deg', 'skew: 20deg');
    assertHeader('translateX', '20px', 'translateX: 20px');
    assertHeader('translateY', '20px', 'translateY: 20px');
    assertHeader('matrix', '1, 0, 0, 1, 0, 0', 'matrix: 1,0,0,1,0,0');
  });

  it('should report whether it can mutate', function() {
    assertMutate('skew', '10deg',                   false);
    assertMutate('skew', '10deg, 10deg',            false);
    assertMutate('skewX', '10deg',                  false);
    assertMutate('skewY', '10deg',                  false);
    assertMutate('translate', '20px',               true);
    assertMutate('translate', '20px, 20px',         true);
    assertMutate('translateX', '20px',              false);
    assertMutate('translateY', '20px',              false);
    assertMutate('translateZ', '20px',              false);
    assertMutate('translate3d', '20px, 20px, 20px', true);
    assertMutate('scale', '2',                      false);
    assertMutate('scale', '2, 2',                   false);
    assertMutate('scale3d', '2, 2, 2',              false);
    assertMutate('scaleX', '2',                     false);
    assertMutate('scaleY', '2',                     false);
    assertMutate('scaleZ', '2',                     false);
    assertMutate('rotate', '10deg',                 true);
    assertMutate('rotateX', '10deg',                false);
    assertMutate('rotateY', '10deg',                false);
    assertMutate('rotateZ', '10deg',                true);
    assertMutate('rotate3d', '2, 2, 2, 10deg',      false);
    assertMutate('perspective', '10px',             false);

    assertMutate('matrix', '1,0,0,1,0,0', false);
    assertMutate('matrix3d', '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1', false);
  });

  it('should report whether it is translate', function() {
    assertTranslate('skew', '10deg',                   false);
    assertTranslate('skew', '10deg, 10deg',            false);
    assertTranslate('skewX', '10deg',                  false);
    assertTranslate('skewY', '10deg',                  false);
    assertTranslate('translate', '20px',               true);
    assertTranslate('translate', '20px, 20px',         true);
    assertTranslate('translateX', '20px',              false);
    assertTranslate('translateY', '20px',              false);
    assertTranslate('translateZ', '20px',              false);
    assertTranslate('translate3d', '20px, 20px, 20px', true);
    assertTranslate('scale', '2',                      false);
    assertTranslate('scale', '2, 2',                   false);
    assertTranslate('scale3d', '2, 2, 2',              false);
    assertTranslate('scaleX', '2',                     false);
    assertTranslate('scaleY', '2',                     false);
    assertTranslate('scaleZ', '2',                     false);
    assertTranslate('rotate', '10deg',                 false);
    assertTranslate('rotateX', '10deg',                false);
    assertTranslate('rotateY', '10deg',                false);
    assertTranslate('rotateZ', '10deg',                false);
    assertTranslate('rotate3d', '2, 2, 2, 10deg',      false);
    assertTranslate('perspective', '10px',             false);

    assertTranslate('matrix', '1,0,0,1,0,0', false);
    assertTranslate('matrix3d', '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1', false);
  });

  it('should report whether it is z rotation', function() {
    assertZRotate('skew', '10deg',                   false);
    assertZRotate('skew', '10deg, 10deg',            false);
    assertZRotate('skewX', '10deg',                  false);
    assertZRotate('skewY', '10deg',                  false);
    assertZRotate('translate', '20px',               false);
    assertZRotate('translate', '20px, 20px',         false);
    assertZRotate('translateX', '20px',              false);
    assertZRotate('translateY', '20px',              false);
    assertZRotate('translateZ', '20px',              false);
    assertZRotate('translate3d', '20px, 20px, 20px', false);
    assertZRotate('scale', '2',                      false);
    assertZRotate('scale', '2, 2',                   false);
    assertZRotate('scale3d', '2, 2, 2',              false);
    assertZRotate('scaleX', '2',                     false);
    assertZRotate('scaleY', '2',                     false);
    assertZRotate('scaleZ', '2',                     false);
    assertZRotate('rotate', '10deg',                 true);
    assertZRotate('rotateX', '10deg',                false);
    assertZRotate('rotateY', '10deg',                false);
    assertZRotate('rotateZ', '10deg',                true);
    assertZRotate('rotate3d', '2, 2, 2, 10deg',      false);
    assertZRotate('perspective', '10px',             false);

    assertZRotate('matrix', '1,0,0,1,0,0', false);
    assertZRotate('matrix3d', '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1', false);
  });

  it('should report whether it is a matrix transform', function() {
    assertMatrix('skew', '10deg',                   false);
    assertMatrix('skew', '10deg, 10deg',            false);
    assertMatrix('skewX', '10deg',                  false);
    assertMatrix('skewY', '10deg',                  false);
    assertMatrix('translate', '20px',               false);
    assertMatrix('translate', '20px, 20px',         false);
    assertMatrix('translateX', '20px',              false);
    assertMatrix('translateY', '20px',              false);
    assertMatrix('translateZ', '20px',              false);
    assertMatrix('translate3d', '20px, 20px, 20px', false);
    assertMatrix('scale', '2',                      false);
    assertMatrix('scale', '2, 2',                   false);
    assertMatrix('scale3d', '2, 2, 2',              false);
    assertMatrix('scaleX', '2',                     false);
    assertMatrix('scaleY', '2',                     false);
    assertMatrix('scaleZ', '2',                     false);
    assertMatrix('rotate', '10deg',                 false);
    assertMatrix('rotateX', '10deg',                false);
    assertMatrix('rotateY', '10deg',                false);
    assertMatrix('rotateZ', '10deg',                false);
    assertMatrix('rotate3d', '2, 2, 2, 10deg',      false);
    assertMatrix('perspective', '10px',             false);

    assertMatrix('matrix', '1,0,0,1,0,0', true);
    assertMatrix('matrix3d', '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1', true);
  });

  it('should correctly report if it has percent translation', function() {
    assert.equal(getElementTransformFunction().hasPercentTranslation(), false);
    assert.equal(getElementTransformFunction('translate-percent-box').hasPercentTranslation(), true);
  });

});
