
describe('CSSPositioningProperty', function(uiRoot) {

  var el, matcher, hProp, vProp;

  function setupNormal() {
    el      = appendAbsoluteBox();
    matcher = new CSSRuleMatcher(el);
    hProp   = CSSPositioningProperty.horizontalFromMatcher(matcher);
    vProp   = CSSPositioningProperty.verticalFromMatcher(matcher);
  }

  function setupInverted() {
    el      = appendInvertedBox();
    matcher = new CSSRuleMatcher(el);
    hProp   = CSSPositioningProperty.horizontalFromMatcher(matcher);
    vProp   = CSSPositioningProperty.verticalFromMatcher(matcher);
  }

  teardown(function() {
    releaseAppendedFixtures();
  });

  it('should work on normal properties', function() {
    setupNormal();

    assert.equal(hProp.prop, 'left');
    assert.equal(vProp.prop, 'top');
    assert.equal(hProp.px, 100);
    assert.equal(vProp.px, 100);

    hProp.px = 300;
    vProp.px = 500;

    hProp.render(el.style);
    vProp.render(el.style);

    assert.equal(el.style.left,   '300px');
    assert.equal(el.style.top,    '500px');
    assert.equal(el.style.right,  '');
    assert.equal(el.style.bottom, '');

  });

  it('should work on inverted properties', function() {
    setupInverted();

    assert.equal(hProp.prop, 'right');
    assert.equal(vProp.prop, 'bottom');
    assert.equal(hProp.px, 100);
    assert.equal(vProp.px, 100);

    hProp.px = 20;
    vProp.px = 30;

    hProp.render(el.style);
    vProp.render(el.style);

    assert.equal(el.style.left,   '');
    assert.equal(el.style.top,    '');
    assert.equal(el.style.right,  '20px');
    assert.equal(el.style.bottom, '30px');

  });

  it('should be able to clone itself', function() {
    setupNormal();
    var clone = hProp.clone();
    assert.equal(clone.prop, 'left');
    assert.equal(clone.px, 100);
  });

  it('should export its underlying css value when calling toString', function() {
    setupNormal();
    assert.equal(hProp.toString(), '100px');
    assert.equal(vProp.toString(), '100px');
  });

  // --- CSS Declarations

  it('should append its CSS declaration', function() {
    var decs = [];
    setupNormal();
    hProp.appendCSSDeclaration(decs);
    vProp.appendCSSDeclaration(decs);
    assert.equal(decs[0], 'left: 100px;');
    assert.equal(decs[1], 'top: 100px;');
  });

  it('should not append its CSS declaration if null', function() {
    var decs = [], prop;
    prop = new CSSPositioningProperty(new CSSValue(), 'left');
    prop.appendCSSDeclaration(decs);
    assert.equal(decs.length, 0);
  });

});
