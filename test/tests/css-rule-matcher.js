
describe('CSSRuleMatcher', function() {

  var el, matcher;

  teardown(function() {
    releaseAppendedFixtures();
  });

  function setupMatcher(className) {
    el = appendBox(className);
    matcher = new CSSRuleMatcher(el);
  }

  function assertInitial(matcher, prop, val) {
    assert.equal(matcher.getProperty(prop).isInitial(), val);
  }

  function assertValue(matcher, prop, val) {
    assert.equal(matcher.getValue(prop), val);
  }

  it('should be able to get basic values', function() {
    setupMatcher();
    assertValue(matcher, 'top',    '100px');
    assertValue(matcher, 'left',   '100px');
    assertValue(matcher, 'width',  '100px');
    assertValue(matcher, 'height', '100px');
  });

  it('should return property indicating initial state', function() {
    setupMatcher();
    assertInitial(matcher, 'bottom', true);
  });

  it('should return property indicating initial state for auto', function() {
    setupMatcher('incomplete-box');
    assertInitial(matcher, 'left', true);
  });

  it('should get computed values for auto', function() {
    setupMatcher('incomplete-box');
    assertValue(matcher, 'left', '0px');
  });

  it('should get CSS variables', function() {
    setupMatcher('var-box');
    assertValue(matcher, 'width', '100%');
  });

});
