
describe('BrowserEventTarget', function(uiRoot) {

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

    onMouseDown(evt) {
      this.mousedown = true;
    }

  }

  function setupDivTarget() {
    el = createDiv();
    target = new Target(el);
  }

  function setupLinkTarget() {
    el = createLink('#foo');
    target = new Target(el);
  }

  it('should bind events', function() {
    setupDivTarget();
    target.bindEvent('click', target.onClick);
    fireClick(el);
    assert.equal(target.clicked, true);
  });

  it('should work with multiple events', function() {
    setupDivTarget();
    target.bindEvent('click', target.onClick);
    target.bindEvent('mousedown', target.onMouseDown);
    fireClick(el);
    fireMouseDown(el);
    assert.equal(target.clicked, true);
    assert.equal(target.mousedown, true);
  });

  it('should allow removing event listeners by name', function() {
    setupDivTarget();
    target.bindEvent('click', target.onClick);
    target.removeEventListener('click');
    fireClick(el);
    assert.equal(target.clicked, false);
  });

  it('should allow removing all event listeners', function() {
    setupDivTarget();
    target.bindEvent('click', target.onClick);
    target.bindEvent('mousedown', target.onMouseDown);
    target.removeAllListeners();
    fireClick(el);
    fireMouseDown(el);
    assert.equal(target.clicked, false);
    assert.equal(target.mousedown, false);
  });

  it('should allow preventing events', function() {
    setupDivTarget();
    target.bindEventWithPrevent('click', target.onClick);
    fireClick(el);
    assert.equal(target.lastEvent.defaultPrevented, true);
  });

  it('should allow preventing events without handler', function() {
    setupLinkTarget();
    target.preventDefault('click');
    window.location.hash = '';
    fireClick(el);
    assert.equal(window.location.hash, '');
  });

});
