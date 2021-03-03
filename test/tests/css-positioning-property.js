
describe('CSSPositioningProperty', function() {

  var el, matcher, hProp, vProp;

  function setupNormal() {
    el      = appendBox();
    matcher = new CSSRuleMatcher(el);
    hProp   = CSSPositioningProperty.horizontalFromMatcher(matcher);
    vProp   = CSSPositioningProperty.verticalFromMatcher(matcher);
  }

  function setupInverted() {
    el      = appendBox('inverted-box');
    matcher = new CSSRuleMatcher(el);
    hProp   = CSSPositioningProperty.horizontalFromMatcher(matcher);
    vProp   = CSSPositioningProperty.verticalFromMatcher(matcher);
  }

  teardown(function() {
    releaseAppendedFixtures();
  });

  it('should work on normal properties', function() {
    setupNormal();

    assertEqual(hProp.prop, 'left');
    assertEqual(vProp.prop, 'top');
    assertEqual(hProp.px, 100);
    assertEqual(vProp.px, 100);

    hProp.px = 300;
    vProp.px = 500;

    hProp.render(el.style);
    vProp.render(el.style);

    assertEqual(el.style.left,   '300px');
    assertEqual(el.style.top,    '500px');
    assertEqual(el.style.right,  '');
    assertEqual(el.style.bottom, '');

  });

  it('should work on inverted properties', function() {
    setupInverted();

    assertEqual(hProp.prop, 'right');
    assertEqual(vProp.prop, 'bottom');
    assertEqual(hProp.px, 100);
    assertEqual(vProp.px, 100);

    hProp.px = 20;
    vProp.px = 30;

    hProp.render(el.style);
    vProp.render(el.style);

    assertEqual(el.style.left,   '');
    assertEqual(el.style.top,    '');
    assertEqual(el.style.right,  '20px');
    assertEqual(el.style.bottom, '30px');

  });

  it('should be able to clone itself', function() {
    setupNormal();
    var clone = hProp.clone();
    assertEqual(clone.prop, 'left');
    assertEqual(clone.px, 100);
  });

  it('should export its underlying css value when calling toString', function() {
    setupNormal();
    assertEqual(hProp.toString(), '100px');
    assertEqual(vProp.toString(), '100px');
  });

  // --- CSS Declarations

  it('should append its CSS declaration', function() {
    var decs = [];
    setupNormal();
    hProp.appendCSSDeclaration(decs);
    vProp.appendCSSDeclaration(decs);
    assertEqual(decs[0], 'left: 100px;');
    assertEqual(decs[1], 'top: 100px;');
  });

  it('should not append its CSS declaration if initial', function() {
    var decs = [], prop;
    prop = new CSSPositioningProperty(new CSSPixelValue(50, true), 'left');
    prop.appendCSSDeclaration(decs);
    assertEqual(decs.length, 0);
  });

});
