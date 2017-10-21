
describe('ResizeHandle', function() {

  var listener, fragment;

  class Listener {

    constructor() {
      this.handleStartIntents = 0;
      this.handleStopIntents  = 0;
    }

    onResizeHandleDragIntentStart() {
    }

    onResizeHandleDragIntentStop() {
    }

    onResizeHandleMouseDown() {
    }

    onResizeHandleDragStart() {
    }

    onResizeHandleDragMove(evt, handle) {
      this.lastEventDrag = evt.drag;
      this.lastEventHandle = handle;
    }

    onResizeHandleDragStop() {
    }

  }

  setup(function() {
    listener = new Listener();
    fragment = new MockDocumentFragment();
  });

  function createHandle(dir) {
    return new ResizeHandle(fragment, dir, listener);
  }

  function assertCursor(dir, rotation, expected) {
    var handle = createHandle(dir);
    assert.equal(handle.getCursorForRotation(rotation), expected);
  }

  it('should fire resize handle events', function() {
    var handle = createHandle('se');
    dragElement(handle.el, 200, 200, 300, 250);
    assert.equal(listener.lastEventDrag.x, 100);
    assert.equal(listener.lastEventDrag.y, 50);
    assert.equal(listener.lastEventHandle.dir, 'se');
  });

  it('should be able to get the correct cursor for rotation', function() {
    assertCursor('se', 0, 'nwse-resize');
    assertCursor('s',  0,  'ns-resize');
    assertCursor('sw', 0, 'nesw-resize');
    assertCursor('w',  0,  'ew-resize');
    assertCursor('nw', 0, 'nwse-resize');
    assertCursor('n',  0,  'ns-resize');
    assertCursor('ne', 0, 'nesw-resize');
    assertCursor('e',  0,  'ew-resize');
    assertCursor('se', 45, 'ns-resize');
    assertCursor('s',  45, 'nesw-resize');
    assertCursor('sw', 45, 'ew-resize');
    assertCursor('w',  45, 'nwse-resize');
    assertCursor('nw', 45, 'ns-resize');
    assertCursor('n',  45, 'nesw-resize');
    assertCursor('ne', 45, 'ew-resize');
    assertCursor('e',  45, 'nwse-resize');
    assertCursor('se', 22.4, 'nwse-resize');
    assertCursor('se', 22.6, 'ns-resize');
    assertCursor('se', 67.4, 'ns-resize');
    assertCursor('se', 67.6, 'nesw-resize');
    assertCursor('s',  22.4, 'ns-resize');
    assertCursor('s',  22.6, 'nesw-resize');
  });

});
