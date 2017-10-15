
describe('NudgeManager', function(uiRoot) {

  var listener, manager;

  class Listener {

    constructor() {
      this.nudgeEvents = {};
      this.positionX = 0;
      this.positionY = 0;
      this.nudgeStartEvents = 0;
      this.nudgeStopEvents  = 0;
    }

    onNudgeStart() {
      this.nudgeStartEvents += 1;
    }

    onNudgeStop() {
      this.nudgeStopEvents += 1;
    }

    onNudgeMove(evt) {
      var mode = evt.mode;
      this.nudgeEvents[mode] = (this.nudgeEvents[mode] || 0) + 1;
      if (mode === NudgeManager.POSITION_MODE) {
        this.positionX = evt.x;
        this.positionY = evt.y;
      }
    }

    onNudgeModeChanged(mode) {
      this.nudgeMode = mode;
    }

  }

  setup(function() {
    setTimeoutMock.apply();
    listener = new Listener();
    manager  = new NudgeManager(listener);
  });

  teardown(function() {
    manager.destroy();
    setTimeoutMock.release();
  });

  it('should report the current mode', function() {
    assert.equal(manager.getCurrentMode(), 'position');
    manager.toggleRotateMode();
    assert.equal(manager.getCurrentMode(), 'rotate');
    manager.toggleRotateMode();
    assert.equal(manager.getCurrentMode(), 'position');
  });

  it('should start and stop events when nudging starts', function() {

    assert.equal(listener.nudgeStartEvents, 0);
    assert.equal(listener.nudgeStopEvents,  0);

    manager.addDirection('right');
    assert.equal(listener.nudgeStartEvents, 1);
    assert.equal(listener.nudgeStopEvents,  0);

    manager.addDirection('down');
    assert.equal(listener.nudgeStartEvents, 1);
    assert.equal(listener.nudgeStopEvents,  0);

    manager.removeDirection('down');
    assert.equal(listener.nudgeStartEvents, 1);
    assert.equal(listener.nudgeStopEvents,  0);

    manager.removeDirection('right');
    assert.equal(listener.nudgeStartEvents, 1);
    assert.equal(listener.nudgeStopEvents,  1);

  });

  it('should receive events when nudge mode changed', function() {
    assert.equal(listener.nudgeMode, NudgeManager.POSITION_MODE);
    manager.toggleResizeMode();
    assert.equal(listener.nudgeMode, NudgeManager.RESIZE_SE_MODE);
    manager.toggleResizeMode();
    assert.equal(listener.nudgeMode, NudgeManager.RESIZE_NW_MODE);
    manager.toggleRotateMode();
    assert.equal(listener.nudgeMode, NudgeManager.ROTATE_MODE);
    manager.toggleBackgroundMode();
    assert.equal(listener.nudgeMode, NudgeManager.BACKGROUND_MODE);
    manager.toggleZIndexMode();
    assert.equal(listener.nudgeMode, NudgeManager.Z_INDEX_MODE);
  });

  it('should receive events when nudge direction added', function() {
    manager.addDirection('right');
    assert.equal(listener.nudgeEvents.position, 1);
  });

  it('should delay after first nudge, then fire every 20ms', function() {

    manager.addDirection('right');
    assert.equal(listener.nudgeEvents.position, 1);

    setTimeoutMock.tick(250);
    assert.equal(listener.nudgeEvents.position, 2);

    setTimeoutMock.tick(350);
    assert.equal(listener.nudgeEvents.position, 7);

  });

  it('should be able to apply multiple vectors', function() {

    manager.addDirection('right');
    manager.addDirection('down');

    setTimeoutMock.tick(350);
    assert.equal(listener.positionX, 7);
    assert.equal(listener.positionY, 6);

  });

  it('should be able to remove a direction', function() {

    manager.addDirection('right');
    manager.addDirection('down');

    setTimeoutMock.tick(300);
    assert.equal(listener.positionX, 4);
    assert.equal(listener.positionY, 3);

    manager.removeDirection('down');
    setTimeoutMock.tick(350);
    assert.equal(listener.positionX, 7);
    assert.equal(listener.positionY, 3);

  });

  it('should increase speed over time', function() {

    var toSlow = NudgeManager.DELAY_TO_SLOW;
    var toMid  = NudgeManager.DELAY_TO_MID;
    var toFast = NudgeManager.DELAY_TO_FAST;

    var repeatSlow = NudgeManager.REPEAT_SLOW;
    var repeatMid  = NudgeManager.REPEAT_MID;
    var repeatFast = NudgeManager.REPEAT_FAST;

    var toBeyond = NudgeManager.DELAY_TO_FAST + 1000;
    var expectedTicks = 0;

    manager.addDirection('right');
    manager.addDirection('down');

    setTimeoutMock.tick(toSlow);
    expectedTicks += 2;
    assert.equal(listener.positionX, expectedTicks);
    assert.equal(listener.positionY, expectedTicks - 1);


    setTimeoutMock.tick(toMid);
    expectedTicks += Math.floor((toMid - toSlow) / repeatSlow);
    assert.equal(listener.positionX, expectedTicks);
    assert.equal(listener.positionY, expectedTicks - 1);

    expectedTicks += Math.floor((toFast - toMid) / repeatMid);
    setTimeoutMock.tick(toFast);
    assert.equal(listener.positionX, expectedTicks);
    assert.equal(listener.positionY, expectedTicks - 1);

    expectedTicks += Math.floor((toBeyond - toFast) / repeatFast);
    setTimeoutMock.tick(toBeyond);
    assert.equal(listener.positionX, expectedTicks);
    assert.equal(listener.positionY, expectedTicks - 1);

  });

  it('should be able to set a multiplier', function() {

    manager.setMultiplier(true);
    manager.addDirection('right');
    manager.addDirection('down');

    setTimeoutMock.tick(350);
    assert.equal(listener.positionX, 7 * NudgeManager.MULTIPLIER);
    assert.equal(listener.positionY, 6 * NudgeManager.MULTIPLIER);

  });

  it('should cancel out when opposing directions are added', function() {

    manager.addDirection('right');
    manager.addDirection('left');

    setTimeoutMock.tick(350);
    assert.equal(listener.positionX, 1);
    assert.equal(listener.positionY, 0);

  });

});
