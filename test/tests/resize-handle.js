
describe('ResizeHandle', function(uiRoot) {

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

    onResizeHandleDragStart(evt, handle) {
    }

    onResizeHandleDragMove(evt, handle) {
      this.lastEventDrag = evt.drag;
      this.lastEventHandle = handle;
    }

    onResizeHandleDragStop(evt, handle) {
    }

  }

  setup(function() {
    listener = new Listener();
    fragment = new MockDocumentFragment();
  });

  function createHandle(name) {
    return new ResizeHandle(fragment, name, listener);
  }

  function assertAxisProps(handle, hProp, vProp) {
    assert.equal(handle.hProp, hProp);
    assert.equal(handle.vProp, vProp);
  }

  it('should correctly throw resize events on listener', function() {
    var handle = createHandle('se');
    dragElement(handle.el, 200, 200, 300, 250);
    assert.equal(listener.lastEventDrag.x, 100);
    assert.equal(listener.lastEventDrag.y, 50);
    assert.equal(listener.lastEventHandle.name, 'se');
  });

});
