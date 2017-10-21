(function() {

  class MockDocumentFragment {

    constructor() {
      this.elementsById = {};
      this.elementsBySelector = {};
      this._rootEl = document.createElement('div');
    }

    querySelector(selector) {
      return this._getElement(this.elementsBySelector, selector);
    }

    getElementById(id) {
      return this._getElement(this.elementsById, id);
    }

    setMockDomById(id, tag) {
      this.elementsById[id] = this._createElement(tag);
    }

    _getElement(set, key) {
      if (!set[key]) {
        set[key] = this._createElement('div');
      }
      return set[key];
    }

    _createElement(tag) {
      var el = document.createElement(tag);
      if (tag === 'select') {
        var opt = document.createElement('option');
        el.appendChild(opt);
      }
      this._rootEl.appendChild(el);
      return el;
    }

  }

  window.MockDocumentFragment = MockDocumentFragment;

})();
