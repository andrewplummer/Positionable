
describe('PositionHandle', function() {

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

    onPositionHandleDragStart() {
    }

    onPositionHandleDragMove(evt) {
      this.lastEventDrag = evt.drag;
    }

    onPositionHandleDragStop() {
    }

  }

  setup(function() {
    listener = new Listener();
    fragment = new MockDocumentFragment();
  });

  it('should have drag events', function() {
    var handle = new PositionHandle(listener, fragment);
    dragElement(handle.el, 0, 0, 50, 50);
    assertEqual(listener.lastEventDrag.x, 50);
  });

  it('drag events should be relative to the page', function() {

    whileFakeScrolled(500, () => {
      var handle = new PositionHandle(listener, fragment);
      fireMouseDown(handle.el, 50, 50);
      handle.onScroll();
      handle.onScroll();
      assertEqual(listener.lastEventDrag.x, 0);
      assertEqual(listener.lastEventDrag.y, 500);
      fireDocumentMouseUp(50, 50, 500);
    });

  });

});
