
describe('DragSelection', function(uiRoot) {

  var drag, listener;

  mockGetBoundingClientRect(uiRoot.getElementById('drag-selection'));

  class Listener {

    constructor() {
      this.dragSelectionClearFired = false;
    }

    onDragSelectionStart() {
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

  teardown(function() {
    releaseAppendedFixtures();
  });

  function setupPositionedElement(top, left, width, height) {
    var el = appendAbsoluteBox();
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
    return el;
  }

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

  it('should report elements it contains', function() {
    dragSelection(100, 100, 1000, 1000);
    var el1 = setupPositionedElement('100px', '100px', '100px', '100px');
    var el2 = setupPositionedElement('1000px', '1000px', '100px', '100px');
    assert.equal(drag.contains(el1), true);
    assert.equal(drag.contains(el2), false);
  });

  it('should fire drag selection clear events', function() {
    fireMouseDown(document.documentElement, 0, 0);
    fireDocumentMouseUp(0, 0);
    assert.equal(listener.dragSelectionClearFired, true);
  });

});
