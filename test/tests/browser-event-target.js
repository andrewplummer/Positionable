
describe('BrowserEventTarget', function() {

  var target, el;

  class Target extends BrowserEventTarget {

    constructor(el) {
      super(el);
      this.clicked = false;
      this.mousedown = false;
    }

    onClick(evt) {
      this.clicked = true;
      this.lastEvent = evt;
    }

    onMouseDown() {
      this.mousedown = true;
    }

  }

  function setupDivTarget() {
    el = createDiv();
    target = new Target(el);
  }

  it('should bind events', function() {
    setupDivTarget();
    target.bindEvent('click', target.onClick);
    clickElement(el);
    assertEqual(target.clicked, true);
  });

  it('should work with multiple events', function() {
    setupDivTarget();
    target.bindEvent('click', target.onClick);
    target.bindEvent('mousedown', target.onMouseDown);
    clickElement(el);
    fireMouseDown(el);
    assertEqual(target.clicked, true);
    assertEqual(target.mousedown, true);
  });

  it('should allow removing all event listeners', function() {
    setupDivTarget();
    target.bindEvent('click', target.onClick);
    target.bindEvent('mousedown', target.onMouseDown);
    target.removeAllListeners();
    clickElement(el);
    fireMouseDown(el);
    assertEqual(target.clicked, false);
    assertEqual(target.mousedown, false);
  });

});
