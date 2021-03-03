
describe('DragSelection', function() {

  var dragSelection, listener;

  mockGetBoundingClientRect(uiRoot.getElementById('drag-selection'));

  class Listener {

    constructor() {
      this.dragSelectionClearFired = false;
    }

    onDragSelectionStart() {
    }

    onDragSelectionMove() {
    }

    onDragSelectionStop(dragSelection) {
      this.dragSelection = dragSelection;
    }

    onDragSelectionClear() {
      this.dragSelectionClearFired = true;
    }

  }

  setup(function() {
    listener      = new Listener();
    dragSelection = new DragSelection(listener, uiRoot);
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  function setupPositionedElement(top, left, width, height) {
    var el = appendBox();
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
    return el;
  }

  function dragDocument(startX, startY, endX, endY) {
    fireMouseDown(document.documentElement, startX, startY);
    fireDocumentMouseMove(startX, startY);
    fireDocumentMouseMove(endX, endY);
    fireDocumentMouseUp(endX, endY);
  }

  it('should render', function() {
    var ui =  getUiElement(document.documentElement, '#drag-selection');
    dragDocument(100, 100, 1000, 1000);
    assertEqual(ui.style.left,   '100px');
    assertEqual(ui.style.top,    '100px');
    assertEqual(ui.style.width,  '900px');
    assertEqual(ui.style.height, '900px');
  });

  it('should report elements it contains', function() {
    dragDocument(100, 100, 1000, 1000);
    var el1 = setupPositionedElement('100px', '100px', '100px', '100px');
    var el2 = setupPositionedElement('1000px', '1000px', '100px', '100px');
    assertEqual(dragSelection.contains(el1), true);
    assertEqual(dragSelection.contains(el2), false);
  });

  it('should fire drag selection clear events', function() {
    fireMouseDown(document.documentElement, 0, 0);
    fireDocumentMouseUp(0, 0);
    assertEqual(listener.dragSelectionClearFired, true);
  });

});
