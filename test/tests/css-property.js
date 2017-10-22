
describe('CSSProperty', function() {

  function getProperty(prop, matched, computed) {
    return new CSSProperty(prop, matched, computed);
  }

  function assertValue(prop, matched, computed, expected) {
    assert.equal(getProperty(prop, matched, computed).getValue(), expected);
  }

  function assertInitial(prop, matched, computed, expected) {
    assert.equal(getProperty(prop, matched, computed).isInitial(), expected);
  }

  function assertVertical(prop, matched, computed, expected) {
    assert.equal(getProperty(prop, matched, computed).isVertical(), expected);
  }

  it('should correctly get values', function() {
    assertValue('left',    'auto', '10px', '10px');
    assertValue('left',    '50px', '50px', '50px');
    assertValue('width',   'auto', '50px', '50px');
    assertValue('width',   '',     '50px', '50px');
    assertValue('width',   '50px', '50px', '50px');
    assertValue('z-index', 'auto', 'auto', '');
    assertValue('z-index', '5',    'auto', '5');

    assertValue('backgroundImage', '',         'none', '');
    assertValue('backgroundImage', 'none',     'none', '');
    assertValue('backgroundImage', 'url(foo)', 'http://www.example.com/foo',  'http://www.example.com/foo');

    assertValue('backgroundPosition', '',          '0% 0%',     '');
    assertValue('backgroundPosition', 'initial',   '0% 0%',     '');
    assertValue('backgroundPosition', '20px 20px', '20px 20px', '20px 20px');

    assertValue('transform', 'none',          'none',                       '');
    assertValue('transform', '',              'none',                       '');
    assertValue('transform', 'rotate(45deg)', 'matrix(1, 0, 0, 1, 20, 0)',  'rotate(45deg)');

    assertValue('transformOrigin', '',          '500px 500px', '');
    assertValue('transformOrigin', '20px 20px', '20px 20px',   '20px 20px');
  });

  it('should correctly detect initial values', function() {
    assertInitial('left',    'auto', '10px', true);
    assertInitial('left',    '50px', '50px', false);
    assertInitial('width',   'auto', '50px', true);
    assertInitial('width',   '50px', '50px', false);
    assertInitial('z-index', 'auto', 'auto', true);
    assertInitial('z-index', '5',    'auto', false);

    assertInitial('backgroundImage', '',     'none', true);
    assertInitial('backgroundImage', 'none', 'none', true);
    assertInitial('backgroundImage', 'url(foo)', 'http://www.example.com/foo', false);

    assertInitial('backgroundPosition', '',          '0% 0%',     true);
    assertInitial('backgroundPosition', 'initial',   '0% 0%',     true);
    assertInitial('backgroundPosition', '20px 20px', '20px 20px', false);

    assertInitial('transform', 'none',          'none',                      true);
    assertInitial('transform', '',              'none',                      true);
    assertInitial('transform', 'rotate(45deg)', 'matrix(1, 0, 0, 1, 20, 0)', false);

    assertInitial('transformOrigin', '',          '500px 500px', true);
    assertInitial('transformOrigin', '20px 20px', '20px 20px',   false);
  });

  it('should correctly identify vertical properties', function() {
    assertVertical('left',    '10px', '10px', false);
    assertVertical('top',     '10px', '10px', true);
    assertVertical('right',   '10px', '10px', false);
    assertVertical('bottom',  '10px', '10px', true);
    assertVertical('width',   '10px', '10px', false);
    assertVertical('height',  '10px', '10px', true);
    assertVertical('z-index', '5',    '5',    false);

    assertVertical('backgroundImage',    '',     '',        false);
    assertVertical('backgroundPosition', '',     '0% 0%',   false);
    assertVertical('transform',          'none', 'none',    false);
    assertVertical('transformOrigin',    '',     '0px 0px', false);
  });

  // --- Other

  it('should replace positioning keywords in transformOrigin and backgroundPosition', function() {
    assertValue('backgroundPosition', 'left top',      '0% 0%',   '0% 0%');
    assertValue('backgroundPosition', 'right bottom',  '0% 0%',   '100% 100%');
    assertValue('backgroundPosition', 'center center', '0% 0%',   '50% 50%');
    assertValue('transformOrigin',    'left top',      '5px 5px', '0% 0%');
    assertValue('transformOrigin',    'right bottom',  '5px 5px', '100% 100%');
    assertValue('transformOrigin',    'center center', '5px 5px', '50% 50%');
  });

  it('should replace reversed positioning keywords', function() {
    assertValue('backgroundPosition', 'bottom left',  '0% 0%',  '0% 100%');
    assertValue('backgroundPosition', 'top right',    '0% 0%',  '100% 0%');
    assertValue('backgroundPosition', 'center right', '0% 0%', '100% 50%');
  });

  it('should not fail on css variables', function() {
    assertValue('left', 'var(--foo)', '10px', '10px');
    assertInitial('left', 'var(--foo)', '10px', false);
  });

  it('should coerce linear gradient urls', function() {
    var standard = 'linear-gradient(red 0%, black 100%)';
    var webkit   = '-webkit-linear-gradient(red 0%, black 100%)';
    assertValue('backgroundImage', '',   standard, '');
    assertValue('backgroundImage', '',   webkit,   '');
  });

});
