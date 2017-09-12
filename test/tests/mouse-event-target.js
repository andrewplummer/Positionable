
/** REMOVED
describe('MouseEventTarget', function(uiRoot) {

  var target, el;

  class Target extends MouseEventTarget {

    onMouseDown(evt) {
      this.lastEvent = evt;
    }

  }

  setup(function() {
    el = createDiv();
    target = new Target(el);
  });

  it('should set abs coordinates', function() {
    target.bindEvent('mousedown', target.onMouseDown);
    mouseDown(el, 50, 100);

    assert.equal(target.lastEvent.absX, 50);
    assert.equal(target.lastEvent.absY, 100);
  });

});
*/
