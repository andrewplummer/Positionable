
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

  function dragSelection(startX, startY, endX, endY) {
    fireMouseDown(document.documentElement, startX, startY);
    fireDocumentMouseMove(startX, startY);
    fireDocumentMouseMove(endX, endY);
    fireDocumentMouseUp(endX, endY);
  }

  it('should render', function() {
    var ui =  getUiElement(document.documentElement, '#drag-selection');
    dragSelection(100, 100, 1000, 1000);
    assert.equal(ui.style.left,   '100px');
    assert.equal(ui.style.top,    '100px');
    assert.equal(ui.style.width,  '900px');
    assert.equal(ui.style.height, '900px');
  });

  it('should report points it contains', function() {
    dragSelection(100, 100, 1000, 1000);
    assert.equal(drag.contains(new Point(0,    0)), false);
    assert.equal(drag.contains(new Point(100,  100)), true);
    assert.equal(drag.contains(new Point(100,  1000)), true);
    assert.equal(drag.contains(new Point(1000, 100)), true);
    assert.equal(drag.contains(new Point(1000, 1000)), true);
    assert.equal(drag.contains(new Point(1001, 1001)), false);
  });

  it('should fire drag selection clear events', function() {
    fireMouseDown(document.documentElement, 0, 0);
    fireDocumentMouseUp(0, 0);
    assert.equal(listener.dragSelectionClearFired, true);
  });

});
