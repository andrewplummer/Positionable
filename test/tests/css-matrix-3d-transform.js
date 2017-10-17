
describe('CSSMatrix3DTransform', function(uiRoot) {

  var CSS = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';

  it('should report that it cannot be rotated', function() {
    var transform = new CSSMatrix3DTransform(CSS);
    assert.isFalse(transform.canBeRotated());
  });

  it('should return itself as toString', function() {
    var transform = new CSSMatrix3DTransform(CSS);
    assert.equal(transform.toString(), CSS);
  });

  it('should return itself as its header', function() {
    var transform = new CSSMatrix3DTransform(CSS);
    assert.equal(transform.getHeader(), CSS);
  });

  it('should return itself on clone', function() {
    var transform = new CSSMatrix3DTransform(CSS);
    assert.equal(transform.clone(), transform);
  });

});
