
describe('AlignmentManager', function() {

  var els, listener, manager;

  setup(function() {
    setupElements();
    listener = new Listener();
    manager  = new AlignmentManager();
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  class Listener {}

  function setupElements() {
    els = [];
    els.push(new PositionableElement(listener, appendBox('align-box-1')));
    els.push(new PositionableElement(listener, appendBox('align-box-2')));
    els.push(new PositionableElement(listener, appendBox('align-box-3')));
    els.push(new PositionableElement(listener, appendBox('align-box-4')));
  }

  // --- Align

  it('should align boxes by left edge', function() {
    manager.align(els, 'left');
    assertEqual(els[0].el.style.left, '');
    assertEqual(els[1].el.style.left, '80px');
    assertEqual(els[2].el.style.left, '80px');
    assertEqual(els[3].el.style.left, '80px');
  });

  it('should align boxes by top edge', function() {
    manager.align(els, 'top');
    assertEqual(els[0].el.style.top, '');
    assertEqual(els[1].el.style.top, '50px');
    assertEqual(els[2].el.style.top, '');
    assertEqual(els[3].el.style.top, '50px');
  });

  it('should align boxes by right edge', function() {
    manager.align(els, 'right');
    assertEqual(els[0].el.style.left, '');
    assertEqual(els[1].el.style.left, '750px');
    assertEqual(els[2].el.style.left, '690px');
    assertEqual(els[3].el.style.left, '580px');
  });

  it('should align boxes by bottom edge', function() {
    manager.align(els, 'bottom');
    assertEqual(els[0].el.style.top, '439px');
    assertEqual(els[1].el.style.top, '');
    assertEqual(els[2].el.style.top, '479px');
    assertEqual(els[3].el.style.top, '419px');
  });

  it('should align boxes by horizontal center', function() {
    manager.align(els, 'hcenter');
    assertEqual(els[0].el.style.left, '108px');
    assertEqual(els[1].el.style.left, '443px');
    assertEqual(els[2].el.style.left, '413px');
    assertEqual(els[3].el.style.left, '358px');
  });

  it('should align boxes by vertical center', function() {
    manager.align(els, 'vcenter');
    assertEqual(els[0].el.style.top, '263px');
    assertEqual(els[1].el.style.top, '318px');
    assertEqual(els[2].el.style.top, '283px');
    assertEqual(els[3].el.style.top, '253px');
  });

  // --- Distribute

  it('should distribute boxes by horizontal center', function() {
    manager.distribute(els, 'hcenter');
    assertEqual(els[0].el.style.left, '');
    assertEqual(els[1].el.style.left, '430px');
    assertEqual(els[2].el.style.left, '605px');
    assertEqual(els[3].el.style.left, '255px');
  });

  it('should distribute boxes by vertical center', function() {
    manager.distribute(els, 'vcenter');
    assertEqual(els[0].el.style.top, '');
    assertEqual(els[1].el.style.top, '');
    assertEqual(els[2].el.style.top, '223px');
    assertEqual(els[3].el.style.top, '356px');
  });

  // --- Other

  it('should push all states so that they can undo together', function() {
    manager.align(els, 'left');
    assertEqual(els[0].states.length, 1);
    assertEqual(els[1].states.length, 1);
    assertEqual(els[2].states.length, 1);
    assertEqual(els[3].states.length, 1);
  });

});
