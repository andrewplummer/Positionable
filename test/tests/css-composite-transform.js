
describe('CSSCompositeTransform', function(uiRoot) {

  function getComplexTransform() {
    return new CSSCompositeTransform([
      new CSSCompositeTransformFunction('rotate',    [new CSSDegreeValue(45)]),
      new CSSCompositeTransformFunction('scale',     [new CSSValue(2), new CSSValue(4)]),
      new CSSCompositeTransformFunction('skew',      [new CSSDegreeValue(5), new CSSDegreeValue(45)]),
      new CSSCompositeTransformFunction('translate', [new CSSPixelValue(20), new CSSPixelValue(30)]),
    ]);
  }

  function assertTransformForElement(className, expected) {
    var el = appendAbsoluteBox(className);
    var matcher = new CSSRuleMatcher(el);
    var transform = CSSCompositeTransform.parse(matcher.getMatchedProperty('transform'), el);
    assert.equal(transform.toString(), expected);
  }

  it('should report that it can be rotated', function() {
    assert.isTrue(getComplexTransform().canBeRotated());
  });

  it('should export correct headers', function() {
    var transform = getComplexTransform();
    assert.equal(transform.getHeader(), 'r: 45deg | scale: 2, 4 | skew: 5deg, 45deg | t: 20px, 30px');
  });

  it('should allow all transform types', function() {
    assertTransformForElement('translate-box', 'translate(20px, 30px)');
    assertTransformForElement('translate-x-box', 'translateX(20px)');
    assertTransformForElement('translate-y-box', 'translateY(20px)');
    assertTransformForElement('translate-z-box', 'translateZ(20px)');
    assertTransformForElement('rotate-box', 'rotate(45deg)');
    assertTransformForElement('rotate-3d-box', 'rotate3d(1, 2, 3, 20deg)');
    assertTransformForElement('rotate-x-box', 'rotateX(20deg)');
    assertTransformForElement('rotate-y-box', 'rotateY(20deg)');
    assertTransformForElement('rotate-z-box', 'rotateZ(20deg)');
    assertTransformForElement('scale-box', 'scale(2, 3)');
    assertTransformForElement('scale-x-box', 'scaleX(2)');
    assertTransformForElement('scale-y-box', 'scaleY(2)');
    assertTransformForElement('scale-z-box', 'scaleZ(2)');
    assertTransformForElement('skew-box', 'skew(20deg, 20deg)');
    assertTransformForElement('skew-x-box', 'skewX(20deg)');
    assertTransformForElement('skew-y-box', 'skewY(20deg)');
    assertTransformForElement('perspective-box', 'perspective(500px)');
  });

});
