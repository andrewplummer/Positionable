
describe('RotationHandle', function(uiRoot) {

  var listener, fragment;

  class Listener {

    constructor() {
      this.handleStartIntents = 0;
      this.handleStopIntents  = 0;
    }

    onRotationHandleDragIntentStart() {
      this.handleStartIntents += 1;
    }

    onRotationHandleDragIntentStop() {
      this.handleStopIntents += 1;
    }

    onRotationHandleMouseDown() {
    }

    onRotationHandleDragStart(evt) {
    }

    onRotationHandleDragMove(evt) {
      this.lastDragMove = evt;
    }

    onRotationHandleDragStop(evt) {
    }

  }

  setup(function() {
    listener = new Listener();
    fragment = new MockDocumentFragment();
  });

  it('should fire rotation handle events', function() {

    var origin = new Point(50, 50);
    var handle = new RotationHandle(fragment, listener, 0, origin);

    dragElement(handle.el, 100, 100, 50, 100);
    assert.equal(listener.lastDragMove.clientX, 50);
    assert.equal(listener.lastDragMove.clientY, 100);
  });

  it('should fire drag intent events', function() {

    var origin = new Point(50, 50);
    var handle = new RotationHandle(fragment, listener, 0, origin);

    fireMouseOver(handle.el, 50, 100);
    dragElement(handle.el, 100, 100, 50, 100);
    fireMouseOut(handle.el, 50, 100);
    assert.equal(listener.handleStartIntents, 1);
    assert.equal(listener.handleStopIntents, 1);
  });

});
