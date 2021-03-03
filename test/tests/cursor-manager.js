
describe('CursorManager', function() {

  var manager = new CursorManager(ShadowDomInjector.BASE_PATH);

  function getBodyCursor() {
    return window.getComputedStyle(document.body).cursor;
  }

  teardown(function() {
    manager.clearDragCursor();
    manager.clearHoverCursor();
  });

  // --- Hover Cursors

  it('should be able to set a hover cursor', function() {
    manager.setHoverCursor('move');
    assertEqual(getBodyCursor(), 'move');
    manager.clearHoverCursor();
    assertEqual(getBodyCursor(), 'auto');
  });

  it('should be able to set a priority hover cursor', function() {
    manager.setHoverCursor('ew-resize');
    assertEqual(getBodyCursor(), 'ew-resize');
    manager.setPriorityHoverCursor('move');
    assertEqual(getBodyCursor(), 'move');
    manager.clearPriorityHoverCursor();
    assertEqual(getBodyCursor(), 'ew-resize');
    manager.setPriorityHoverCursor('move');
    assertEqual(getBodyCursor(), 'move');
    manager.clearHoverCursor();
    assertEqual(getBodyCursor(), 'auto');
  });

  it('should show the priority hover cursor after the normal one has been set', function() {
    manager.setPriorityHoverCursor('move');
    assertEqual(getBodyCursor(), 'auto');
    manager.setHoverCursor('ew-resize');
    assertEqual(getBodyCursor(), 'move');
    manager.clearPriorityHoverCursor();
    assertEqual(getBodyCursor(), 'ew-resize');
    manager.clearHoverCursor();
    assertEqual(getBodyCursor(), 'auto');
  });

  it('should retain the priority hover cursor even when the main hover cursor has been cleared', function() {
    manager.setPriorityHoverCursor('move');
    manager.setHoverCursor('ew-resize');
    assertEqual(getBodyCursor(), 'move');
    manager.clearHoverCursor();
    assertEqual(getBodyCursor(), 'auto');
    manager.setHoverCursor('ew-resize');
    assertEqual(getBodyCursor(), 'move');
    manager.clearPriorityHoverCursor();
    manager.clearHoverCursor();
  });

  // --- Drag Cursors

  it('should be able to set a drag cursor', function() {
    manager.setDragCursor('move');
    assertEqual(getBodyCursor(), 'move');
    manager.clearDragCursor();
    assertEqual(getBodyCursor(), 'auto');
  });

  it('should give priority to the drag cursor', function() {
    manager.setDragCursor('ew-resize');
    manager.setHoverCursor('move');
    assertEqual(getBodyCursor(), 'ew-resize');
  });

  it('should show the last cursor set of the same type', function() {
    manager.setDragCursor('ew-resize');
    manager.setDragCursor('move');
    assertEqual(getBodyCursor(), 'move');
  });

  it('should show nothing when both are cleared', function() {
    manager.setDragCursor('ew-resize');
    manager.setHoverCursor('move');
    manager.clearDragCursor();
    manager.clearHoverCursor();
    assertEqual(getBodyCursor(), 'auto');
  });

  // --- Drag Cursors

  it('should get set an image cursor correctly', function() {
    var cursor;
    // Prevent it from actually trying to load the image.
    manager.render = function() {
      cursor = this.getActiveCursor();
    };
    manager.setHoverCursor('foo', true);
    assertEqual(cursor, `url(${ShadowDomInjector.BASE_PATH}images/cursors/foo.png) 13 13, pointer`);
    manager.clearHoverCursor();
  });

});
