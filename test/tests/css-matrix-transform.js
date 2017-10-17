
describe('CSSMatrixTransform', function(uiRoot) {

  var matrix, strings;

  strings = {
    // Null
    'none': 'matrix(1, 0, 0, 1, 0, 0)',

    // Basic
    'rotate(45deg)':         'matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)',
    'rotate(-45deg)':        'matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)',
    'translate(50px, 50px)': 'matrix(1, 0, 0, 1, 50, 50)',
    'translate(80px, 80px)': 'matrix(1, 0, 0, 1, 80, 80)',

    // Multiple
    'rotate(45deg) translate(50px, 50px)': 'matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 70.7107)',
    'translate(50px, 50px) rotate(45deg)': 'matrix(0.707107, 0.707107, -0.707107, 0.707107, 50, 50)',
    'translate(50px, 50px) rotate(-45deg)': 'matrix(0.707107, -0.707107, 0.707107, 0.707107, 50, 50)',
    'translate(80px, 80px) rotate(30deg) scale(3) skew(10deg, 20deg)': 'matrix(2.05212, 2.44562, -1.04189, 2.86257, 80, 80)',

    // Complex
    'rotate(30deg) scale(3) skew(10deg, 20deg) translate(30px, 30px)': 'matrix(2.05212, 2.44562, -1.04189, 2.86257, 30.307, 159.246)',
    'rotate(30deg) scale(3) skew(10deg, 20deg) translate(30px, 30px) rotate(-15deg)': 'matrix(0.714342, 3.75346, -2.1878, 0.294824, 30.307, 159.246)'
  };

  function getNullMatrix() {
    return new CSSMatrixTransform(1, 0, 0, 1, 0, 0);
  }

  function getRotatedMatrix() {
    // rotate(45deg)
    return new CSSMatrixTransform(0.707107, 0.707107, -0.707107, 0.707107, 0, 0);
  }

  function getTranslatedMatrix() {
    // translate(50px, 50px)
    return new CSSMatrixTransform(1, 0, 0, 1, 50, 50);
  }

  function getRotateTranslateMatrix() {
    // rotate(45deg) translate(50px, 50px)
    return new CSSMatrixTransform(0.707107, 0.707107, -0.707107, 0.707107, 0, 70.7107);
  }

  function getTranslateRotateMatrix() {
    // translate(50px, 50px) rotate(45deg)
    return new CSSMatrixTransform(0.707107, 0.707107, -0.707107, 0.707107, 50, 50);
  }

  function getComplexMatrix() {
    // rotate(30deg) scale(3) skew(10deg, 20deg) translate(30px, 30px);
    return new CSSMatrixTransform(2.05212, 2.44562, -1.04189, 2.86257, 30.307, 159.246);
  }

  function m(composite) {
    return strings[composite];
  }

  it('should be able to parse a matrix string', function() {
    assert.equal(CSSMatrixTransform.parse(m('rotate(45deg)')).toString(), m('rotate(45deg)'));
  });

  it('should have a short form for header', function() {
    assert.equal(CSSMatrixTransform.parse(m('rotate(45deg)')).getHeader(), 'matrix(0.71, 0.71, -0.71, 0.71, 0, 0)');
  });

  it('should be able to clone itself', function() {
    matrix = getTranslatedMatrix().clone();
    assert.equal(matrix.a,  1);
    assert.equal(matrix.b,  0);
    assert.equal(matrix.c,  0);
    assert.equal(matrix.d,  1);
    assert.equal(matrix.tx, 50);
    assert.equal(matrix.ty, 50);
  });

  // --- Getting Components

  it('should be able to get components of a null matrix', function() {
    matrix = getNullMatrix();
    assert.equal(matrix.getRotation(), 0);
    assert.equal(matrix.getTranslation().x, 0);
    assert.equal(matrix.getTranslation().y, 0);
  });

  it('should be able to get components of a rotated matrix', function() {
    matrix = getRotatedMatrix();
    assert.equal(matrix.getRotation(), 45);
    assert.equal(matrix.getTranslation().x, 0);
    assert.equal(matrix.getTranslation().y, 0);
  });

  it('should be able to get components of a translated matrix', function() {
    matrix = getTranslatedMatrix();
    assert.equal(matrix.getRotation(), 0);
    assert.equal(matrix.getTranslation().x, 50);
    assert.equal(matrix.getTranslation().y, 50);
  });

  it('should be able to get components of a rotate translate matrix', function() {
    matrix = getRotateTranslateMatrix();
    assert.equal(matrix.getRotation(), 45);
    assert.equal(matrix.getTranslation().x, 0);
    assert.equal(matrix.getTranslation().y, 70.7107);
  });

  it('should be able to get components of a translate rotate matrix', function() {
    matrix = getTranslateRotateMatrix();
    assert.equal(matrix.getRotation(), 45);
    assert.equal(matrix.getTranslation().x, 50);
    assert.equal(matrix.getTranslation().y, 50);
  });

  // --- Rotation

  it('should be able to set rotation of a null matrix', function() {
    var matrix = getNullMatrix();

    matrix.setRotation(45);
    assert.equal(matrix.toString(), m('rotate(45deg)'));

    matrix.setRotation(-45);
    assert.equal(matrix.toString(), m('rotate(-45deg)'));

    matrix.setRotation(0);
    assert.equal(matrix.toString(), m('none'));
  });

  it('should be able to set rotation of a rotated matrix', function() {
    var matrix = getRotatedMatrix();

    matrix.setRotation(45);
    assert.equal(matrix.toString(), m('rotate(45deg)'));

    matrix.setRotation(-45);
    assert.equal(matrix.toString(), m('rotate(-45deg)'));

    matrix.setRotation(0);
    assert.equal(matrix.toString(), m('none'));
  });

  it('should be able to set rotation of a translated matrix', function() {
    var matrix = getTranslatedMatrix();

    matrix.setRotation(45);
    assert.equal(matrix.toString(), m('translate(50px, 50px) rotate(45deg)'));

    matrix.setRotation(-45);
    assert.equal(matrix.toString(), m('translate(50px, 50px) rotate(-45deg)'));

    matrix.setRotation(0);
    assert.equal(matrix.toString(), m('translate(50px, 50px)'));
  });

  it('should be able to set rotation of a complex matrix', function() {
    var matrix = getComplexMatrix();

    matrix.setRotation(45);
    assert.equal(matrix.toString(), 'matrix(2.13512, 2.18683, -0.859072, 3.06483, 30.307, 159.246)');

    matrix.setRotation(-45);
    assert.equal(matrix.toString(), 'matrix(0.833468, -3.09077, 2.14524, 2.15, 30.307, 159.246)');

    matrix.setRotation(0);
    assert.equal(matrix.toString(), 'matrix(2.28826, 1.27113, -0.24618, 3.54395, 30.307, 159.246)');
  });

  // --- Rotation

  it('should be able to set translation of a null matrix', function() {
    var matrix = getNullMatrix();
    matrix.setTranslation(new Point(50, 50));
    assert.equal(matrix.toString(), m('translate(50px, 50px)'));
  });

  it('should be able to set translation of a rotated matrix', function() {
    var matrix = getRotatedMatrix();
    matrix.setTranslation(new Point(50, 50));
    // CSSMatrixTransform is not interested in the commutability of
    // applied transforms, so it's okay that the result here is actually
    // the reverse of the applied transform.
    assert.equal(matrix.toString(), m('translate(50px, 50px) rotate(45deg)'));
  });

  it('should be able to set translation of a translated matrix', function() {
    var matrix = getTranslatedMatrix();
    matrix.setTranslation(new Point(80, 80));
    assert.equal(matrix.toString(), m('translate(80px, 80px)'));
  });

  it('should be able to set translation of a complex matrix', function() {
    var matrix = getComplexMatrix();
    matrix.setTranslation(new Point(80, 80));
    assert.equal(matrix.toString(), m('translate(80px, 80px) rotate(30deg) scale(3) skew(10deg, 20deg)'));
  });

  it('should be able add its declarations', function() {
    var decs = [];
    getRotatedMatrix().appendCSSDeclaration(decs);
    assert.equal(decs[0], `transform: ${m('rotate(45deg)')};`);
  });

});
