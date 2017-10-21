
describe('CursorManager', function() {

  var manager = new CursorManager(ShadowDomInjector.BASE_PATH);

  function getBodyCursor() {
    return window.getComputedStyle(document.body).cursor;
  }

  teardown(function() {
    manager.clearDragCursor();
    manager.clearHoverCursor();
  });

  function assertRotateDragCursorSet(r, reg) {
    manager.setRotateDragCursor(r);
    assert.match(getBodyCursor(), reg);
  }

  function assertResizeDragCursorSet(name, r, match) {
    manager.setResizeDragCursor(name, r);
    assert.equal(getBodyCursor(), match);
  }

  function assertRotateHoverCursorSet(r, reg) {
    manager.setRotateHoverCursor(r);
    assert.match(getBodyCursor(), reg);
  }

  function assertResizeHoverCursorSet(name, r, match) {
    manager.setResizeHoverCursor(name, r);
    assert.equal(getBodyCursor(), match);
  }

  // --- Hover Cursors

  it('should be able to set a hover cursor', function() {
    manager.setHoverCursor('move');
    assert.equal(getBodyCursor(), 'move');
    manager.clearHoverCursor();
    assert.equal(getBodyCursor(), 'auto');
  });

  it('should be able to set a priority hover cursor', function() {
    manager.setHoverCursor('ew-resize');
    assert.equal(getBodyCursor(), 'ew-resize');
    manager.setPriorityHoverCursor('move');
    assert.equal(getBodyCursor(), 'move');
    manager.clearPriorityHoverCursor();
    assert.equal(getBodyCursor(), 'ew-resize');
    manager.setPriorityHoverCursor('move');
    assert.equal(getBodyCursor(), 'move');
    manager.clearHoverCursor();
    assert.equal(getBodyCursor(), 'auto');
  });

  it('should show the priority hover cursor after the normal one has been set', function() {
    manager.setPriorityHoverCursor('move');
    assert.equal(getBodyCursor(), 'auto');
    manager.setHoverCursor('ew-resize');
    assert.equal(getBodyCursor(), 'move');
    manager.clearPriorityHoverCursor();
    assert.equal(getBodyCursor(), 'ew-resize');
    manager.clearHoverCursor();
    assert.equal(getBodyCursor(), 'auto');
  });

  it('should retain the priority hover cursor even when the main hover cursor has been cleared', function() {
    manager.setPriorityHoverCursor('move');
    manager.setHoverCursor('ew-resize');
    assert.equal(getBodyCursor(), 'move');
    manager.clearHoverCursor();
    assert.equal(getBodyCursor(), 'auto');
    manager.setHoverCursor('ew-resize');
    assert.equal(getBodyCursor(), 'move');
    manager.clearPriorityHoverCursor();
    manager.clearHoverCursor();
  });

  // --- Drag Cursors

  it('should be able to set a drag cursor', function() {
    manager.setDragCursor('move');
    assert.equal(getBodyCursor(), 'move');
    manager.clearDragCursor();
    assert.equal(getBodyCursor(), 'auto');
  });

  it('should give priority to the drag cursor', function() {
    manager.setDragCursor('ew-resize');
    manager.setHoverCursor('move');
    assert.equal(getBodyCursor(), 'ew-resize');
  });

  it('should show the last cursor set of the same type', function() {
    manager.setDragCursor('ew-resize');
    manager.setDragCursor('move');
    assert.equal(getBodyCursor(), 'move');
  });

  it('should show nothing when both are cleared', function() {
    manager.setDragCursor('ew-resize');
    manager.setHoverCursor('move');
    manager.clearDragCursor();
    manager.clearHoverCursor();
    assert.equal(getBodyCursor(), 'auto');
  });

  it('should be able to set rotate cursors', function() {
    assertRotateDragCursorSet(0,   /rotate-se/);
    assertRotateDragCursorSet(45,  /rotate-s/);
    assertRotateDragCursorSet(90,  /rotate-sw/);
    assertRotateDragCursorSet(135, /rotate-w/);
    assertRotateDragCursorSet(180, /rotate-nw/);
    assertRotateDragCursorSet(225, /rotate-n/);
    assertRotateDragCursorSet(270, /rotate-ne/);
    assertRotateDragCursorSet(315, /rotate-e/);
  });

  it('should respect rotate cursor thresholds for rotation', function() {
    assertRotateDragCursorSet(22.4, /rotate-se/);
    assertRotateDragCursorSet(22.6, /rotate-s/);
    assertRotateDragCursorSet(67.4, /rotate-s/);
    assertRotateDragCursorSet(67.6, /rotate-sw/);
  });

  it('should be able to set and clear resize cursors with no rotation', function() {
    assertResizeDragCursorSet('se', 0, 'nwse-resize');
    assertResizeDragCursorSet('s', 0,  'ns-resize');
    assertResizeDragCursorSet('sw', 0, 'nesw-resize');
    assertResizeDragCursorSet('w', 0,  'ew-resize');
    assertResizeDragCursorSet('nw', 0, 'nwse-resize');
    assertResizeDragCursorSet('n', 0,  'ns-resize');
    assertResizeDragCursorSet('ne', 0, 'nesw-resize');
    assertResizeDragCursorSet('e', 0,  'ew-resize');
  });

  it('should be able to set a resize cursor with 45 degrees rotation', function() {
    assertResizeDragCursorSet('se', 45, 'ns-resize');
    assertResizeDragCursorSet('s',  45, 'nesw-resize');
    assertResizeDragCursorSet('sw', 45, 'ew-resize');
    assertResizeDragCursorSet('w',  45, 'nwse-resize');
    assertResizeDragCursorSet('nw', 45, 'ns-resize');
    assertResizeDragCursorSet('n',  45, 'nesw-resize');
    assertResizeDragCursorSet('ne', 45, 'ew-resize');
    assertResizeDragCursorSet('e',  45, 'nwse-resize');
  });

  it('should respect resize cursor thresholds for rotation', function() {
    assertResizeDragCursorSet('se', 22.4, 'nwse-resize');
    assertResizeDragCursorSet('se', 22.6, 'ns-resize');
    assertResizeDragCursorSet('se', 67.4, 'ns-resize');
    assertResizeDragCursorSet('se', 67.6, 'nesw-resize');
    assertResizeDragCursorSet('s',  22.4, 'ns-resize');
    assertResizeDragCursorSet('s',  22.6, 'nesw-resize');
  });

  it('should have helper methods for hover cursors as well', function() {
    assertResizeHoverCursorSet('se', 45, 'ns-resize');
    assertRotateHoverCursorSet(67.6, /rotate-sw/);
  });
});
