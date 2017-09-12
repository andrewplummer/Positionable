
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
      this.lastRotation = evt.rotation;
    }

    onRotationHandleDragStop(evt) {
    }

  }

  setup(function() {
    listener = new Listener();
    fragment = new MockDocumentFragment();
  });

  it('should default to 0 rotation', function() {
    var handle = new RotationHandle(fragment, listener);
    assert.equal(handle.rotation, 0);
  });

  it('should rotate 45 degrees', function() {

    var origin = new Point(50, 50);
    var handle = new RotationHandle(fragment, listener, 0, origin);

    dragElement(handle.el, 100, 100, 50, 100);
    assert.equal(listener.lastRotation.abs, 45);
    assert.equal(listener.lastRotation.offset, 45);
    assert.equal(handle.rotation, 45);
  });

  it('should rotate 90 from 45 degree start', function() {

    var origin = new Point(50, 50);
    var handle = new RotationHandle(fragment, listener, 45, origin);

    dragElement(handle.el, 50, 100, 0, 100);
    assert.equal(listener.lastRotation.abs, 90);
    assert.equal(listener.lastRotation.offset, 45);
    assert.equal(handle.rotation, 90);
  });

  it('should account for document scrolling by default', function() {

    whileScrolled(100, () => {
      var origin = new Point(50, 50);
      var handle = new RotationHandle(fragment, listener, 45, origin);

      dragElement(handle.el, 50, 0, 0, 0);
      assert.equal(listener.lastRotation.abs, 90);
      assert.equal(listener.lastRotation.offset, 45);
    });
  });

  it('should ignore document scrolling when origin is fixed', function() {

    whileScrolled(100, () => {
      var origin = new Point(50, 50);
      var handle = new RotationHandle(fragment, listener, 45, origin, true);

      dragElement(handle.el, 50, 100, 0, 100);
      assert.equal(listener.lastRotation.abs, 90);
      assert.equal(listener.lastRotation.offset, 45);
    });
  });

});
