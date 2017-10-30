(function() {

  class MockCSSRuleMatcher {

    constructor() {
      this.props = {};
    }

    getProperty(name) {
      return this.props[name];
    }

    setProperty(name, val) {
      this.props[name] = new MockCSSProperty(name, val);
    }

    getValue(key) {
      return this.props[key].getValue();
    }

  }

  class MockCSSProperty {

    constructor(name, val) {
      this.name = name;
      this.val  = val;
    }

    getValue() {
      return this.val;
    }

    isInitial() {
      return true;
    }

  }

  window.MockCSSRuleMatcher = MockCSSRuleMatcher;

})();
