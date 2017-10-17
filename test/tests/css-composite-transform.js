
describe('CSSCompositeTransform', function(uiRoot) {

  function getComplexTransform() {
    return new CSSCompositeTransform([
      new CSSCompositeTransformFunction('rotate',    [new CSSDegreeValue(45)]),
      new CSSCompositeTransformFunction('scale',     [new CSSValue(2), new CSSValue(4)]),
      new CSSCompositeTransformFunction('skew',      [new CSSDegreeValue(5), new CSSDegreeValue(45)]),
      new CSSCompositeTransformFunction('translate', [new CSSPixelValue(20), new CSSPixelValue(30)]),
    ]);
  }

  it('should export correct headers', function() {
    var transform = getComplexTransform();
    assert.equal(transform.getHeader(), 'r: 45deg | scale: 2, 4 | skew: 5deg, 45deg | t: 20px, 30px');
  });

});
