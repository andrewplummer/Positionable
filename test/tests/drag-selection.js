
describe('DragSelection', function(uiRoot) {

  var drag, listener;

  class Listener {

    constructor() {
      this.dragSelectionClearFired = false;
    }

    onDragSelectionMove(dragSelection) {
    }

    onDragSelectionStop(dragSelection) {
      this.dragSelection = dragSelection;
    }

    onDragSelectionClear() {
      this.dragSelectionClearFired = true;
    }

  }

  setup(function() {
    listener = new Listener();
    drag = new DragSelection(uiRoot, listener);
  });

  function mockBoundingClientRect(el, left, top, width, height) {
    el.getBoundingClientRect = function() {
      return {
        x: left,
        y: top,
        left: left,
        top: top,
        width: width,
        height: height,
        right: left + width,
        bottom: top + height
      }
    };
  }

  function getFakeBox(left, top, width, height) {
    var el = appendAbsoluteBox();
    mockBoundingClientRect(el, left, top, width, height);
    return el;
  }


  it('should render', function() {
    var ui =  getUiElement(document.documentElement, '#drag-selection');
    fireMouseDown(document.documentElement, 100, 100);
    fireDocumentMouseMove(100, 100);
    fireDocumentMouseMove(1000, 1000);
    fireDocumentMouseUp(1000, 1000);
    assert.equal(ui.style.left,   '100px');
    assert.equal(ui.style.top,    '100px');
    assert.equal(ui.style.width,  '900px');
    assert.equal(ui.style.height, '900px');
  });

  it('should report elements it contains', function() {
    var el1 = getFakeBox(100, 100, 100, 100);
    var el2 = getFakeBox(-200, 100, 100, 100);
    mockBoundingClientRect(drag.ui.el, 100, 100, 900, 900);
    assert.equal(drag.contains(el1), true);
    assert.equal(drag.contains(el2), false);
  });

  it('should fire drag selection clear events', function() {
    fireMouseDown(document.documentElement, 0, 0);
    fireDocumentMouseUp(0, 0);
    assert.equal(listener.dragSelectionClearFired, true);
  });

});
