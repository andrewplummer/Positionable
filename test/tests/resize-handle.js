
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

  function createHandle(name) {
    return new ResizeHandle(fragment, name, listener);
  }

  it('should fire resize handle events', function() {
    var handle = createHandle('se');
    dragElement(handle.el, 200, 200, 300, 250);
    assert.equal(listener.lastEventDrag.x, 100);
    assert.equal(listener.lastEventDrag.y, 50);
    assert.equal(listener.lastEventHandle.name, 'se');
  });

});
