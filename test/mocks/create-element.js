(function() {

  var nativeCreateElement = document.createElement;

  class CreateElementMock {

    constructor() {
      this.created = [];
      this.createElement = this.createElement.bind(this);
    }

    // --- Mocks

    apply() {
      document.createElement = this.createElement;
    }

    release() {
      document.createElement = nativeCreateElement;
    }

    getLastCreated() {
      return this.created[this.created.length - 1];
    }

    createElement(tag) {
      switch (tag) {
        case 'a': return this.createMockElement(MockLinkElement);
      }
    }

    createMockElement(mockClass) {
      var mock = new mockClass();
      this.created.push(mock);
      return mock;
    }

  }

  class MockLinkElement {

    constructor() {
      this.tagName = 'A';
      this.clickMethodFired = false;
    }

    click() {
      this.clickMethodFired = true;
    }

  }

  window.createElementMock = new CreateElementMock();

})();
