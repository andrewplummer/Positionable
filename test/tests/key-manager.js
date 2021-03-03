
describe('KeyManager', function() {

  var listener, manager;

  class Listener {

    constructor() {
      this.keyDownEvents = {};
      this.keyUpEvents = {};
      this.commandKeyDownEvents = {};
    }

    onKeyDown(evt) {
      this.lastKeyDownEvent = evt;
      this.keyDownEvents[evt.key] = (this.keyDownEvents[evt.key] || 0) + 1;
    }

    onKeyUp(evt) {
      this.keyUpEvents[evt.key] = (this.keyUpEvents[evt.key] || 0) + 1;
    }

    onCommandKeyDown(evt) {
      this.lastCommandKeyDownEvent = evt;
      this.commandKeyDownEvents[evt.key] = (this.commandKeyDownEvents[evt.key] || 0) + 1;
    }

  }

  setup(function() {
    listener = new Listener();
  });

  teardown(function() {
    manager.destroy();
  });

  function setupManager(isWindows) {
    manager  = new KeyManager(listener, !isWindows);
  }

  it('should setup and receive key events', function() {
    setupManager();

    manager.setupKey(KeyManager.A_KEY);
    manager.setupKey(KeyManager.S_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY);
    fireDocumentKeyDown(KeyManager.S_KEY);
    fireDocumentKeyDown(KeyManager.B_KEY);

    fireDocumentKeyUp(KeyManager.A_KEY);
    fireDocumentKeyUp(KeyManager.S_KEY);
    fireDocumentKeyUp(KeyManager.B_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY);
    fireDocumentKeyUp(KeyManager.A_KEY);

    // Ensure command key doesn't trigger.
    fireDocumentMetaKeyDown(KeyManager.A_KEY);

    assertEqual(listener.keyDownEvents[KeyManager.A_KEY], 2);
    assertEqual(listener.keyDownEvents[KeyManager.S_KEY], 1);
    assertEqual(listener.keyUpEvents[KeyManager.A_KEY], 2);
    assertEqual(listener.keyUpEvents[KeyManager.S_KEY], 1);
    assertEqual(listener.keyDownEvents[KeyManager.B_KEY], undefined);
    assertEqual(listener.keyUpEvents[KeyManager.B_KEY], undefined);

  });

  it('should setup and receive command key events', function() {
    setupManager();

    manager.setupCommandKey(KeyManager.A_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.B_KEY);

    assertEqual(listener.commandKeyDownEvents[KeyManager.A_KEY], 1);
    assertEqual(listener.commandKeyDownEvents[KeyManager.B_KEY], undefined);

  });

  it('should handle both command and basic keys separately', function() {
    setupManager();

    manager.setupKey(KeyManager.A_KEY);
    manager.setupCommandKey(KeyManager.A_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.A_KEY);

    assertEqual(listener.keyDownEvents[KeyManager.A_KEY], 1);
    assertEqual(listener.commandKeyDownEvents[KeyManager.A_KEY], 2);

  });

  it('should not fire when other meta keys are pressed', function() {
    setupManager();

    manager.setupKey(KeyManager.A_KEY);
    manager.setupCommandKey(KeyManager.A_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY, { altKey: true });
    fireDocumentKeyDown(KeyManager.A_KEY, { ctrlKey: true });
    assertEqual(listener.keyDownEvents[KeyManager.A_KEY], undefined);
    assertEqual(listener.commandKeyDownEvents[KeyManager.A_KEY], undefined);

  });

  it('should prevent default on handled key events', function() {
    setupManager();

    manager.setupKey(KeyManager.A_KEY);
    fireDocumentKeyDown(KeyManager.A_KEY);
    assertEqual(listener.lastKeyDownEvent.defaultPrevented, true);
  });

  it('should not allow meta keys when not setup', function() {
    setupManager();

    manager.setupKey(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.A_KEY);
    assertEqual(listener.keyDownEvents[KeyManager.A_KEY], undefined);
    assertEqual(listener.commandKeyDownEvents[KeyManager.A_KEY], undefined);
  });

  it('should not allow arrow keys with shift', function() {
    setupManager();

    manager.setupKey(KeyManager.LEFT_KEY);
    fireDocumentShiftKeyDown(KeyManager.LEFT_KEY);
    assertEqual(listener.keyDownEvents[KeyManager.LEFT_KEY], 1);
  });

  it('should allow deactivation', function() {
    setupManager();

    manager.setupKey(KeyManager.LEFT_KEY);

    manager.setActive(false);
    assertEqual(listener.keyDownEvents[KeyManager.LEFT_KEY], undefined);

    manager.setActive(true);
    fireDocumentShiftKeyDown(KeyManager.LEFT_KEY);

    assertEqual(listener.keyDownEvents[KeyManager.LEFT_KEY], 1);
  });

  it('should allow deactivation with an exception', function() {
    setupManager();

    manager.setupKey(KeyManager.LEFT_KEY);
    manager.setupCommandKey(KeyManager.Z_KEY);
    manager.setupCommandKeyException(KeyManager.Z_KEY);

    manager.setActive(false);
    fireDocumentKeyDown(KeyManager.LEFT_KEY);
    fireDocumentKeyDown(KeyManager.Z_KEY);
    fireDocumentMetaKeyDown(KeyManager.Z_KEY);
    assertEqual(listener.keyDownEvents[KeyManager.LEFT_KEY], undefined);
    assertEqual(listener.keyDownEvents[KeyManager.Z_KEY], undefined);
    assertEqual(listener.commandKeyDownEvents[KeyManager.Z_KEY], 1);

    manager.setActive(true);
    fireDocumentKeyDown(KeyManager.LEFT_KEY);
    fireDocumentKeyDown(KeyManager.Z_KEY);
    fireDocumentMetaKeyDown(KeyManager.Z_KEY);
    assertEqual(listener.keyDownEvents[KeyManager.LEFT_KEY], 1);
    assertEqual(listener.keyDownEvents[KeyManager.Z_KEY], undefined);
    assertEqual(listener.commandKeyDownEvents[KeyManager.Z_KEY], 2);
  });

  it('should use ctrl key for windows instead of command key', function() {
    setupManager(true);

    manager.setupCommandKey(KeyManager.Z_KEY);

    fireDocumentMetaKeyDown(KeyManager.Z_KEY);
    assertEqual(listener.commandKeyDownEvents[KeyManager.Z_KEY], undefined);

    fireDocumentCtrlKeyDown(KeyManager.Z_KEY);
    assertEqual(listener.commandKeyDownEvents[KeyManager.Z_KEY], 1);
  });

});
