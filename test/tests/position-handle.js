
describe('PositionHandle', function(uiRoot) {

  var listener, fragment;

  class Listener {

    constructor() {
      this.handleStartIntents = 0;
      this.handleStopIntents  = 0;
    }

    onPositionHandleDragIntentStart() {
      this.handleStartIntents += 1;
    }

    onPositionHandleDragIntentStop() {
      this.handleStopIntents += 1;
    }

    onPositionHandleMouseDown() {
    }

    onPositionHandleDragStart(evt) {
    }

    onPositionHandleDragMove(evt) {
      this.lastEventDrag = evt.drag;
    }

    onPositionHandleDragStop(evt) {
    }

  }

  setup(function() {
    listener = new Listener();
    fragment = new MockDocumentFragment();
  });

  it('should have drag events', function() {
    var handle = new PositionHandle(fragment, listener);
    dragElement(handle.el, 0, 0, 50, 50);
    assert.equal(listener.lastEventDrag.x, 50);
  });

  it('drag events should be relative to the page', function() {

    whileFakeScrolled(500, () => {
      var handle = new PositionHandle(fragment, listener);
      fireMouseDown(handle.el, 50, 50);
      handle.onScroll();
      handle.onScroll();
      assert.equal(listener.lastEventDrag.x, 0);
      assert.equal(listener.lastEventDrag.y, 500);
      fireDocumentMouseUp(50, 50, 500);
    });

  });

});
