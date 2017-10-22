
describe('AlignmentManager', function() {

  var els, manager;

  setup(function() {
    setupElements();
    manager = new AlignmentManager();
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  function setupElements() {
    els = [];
    els.push(new PositionableElement(appendBox('align-box-1')));
    els.push(new PositionableElement(appendBox('align-box-2')));
    els.push(new PositionableElement(appendBox('align-box-3')));
    els.push(new PositionableElement(appendBox('align-box-4')));
  }

  // --- Align

  it('should align boxes by left edge', function() {
    manager.align(els, 'left');
    assert.equal(els[0].el.style.left, '');
    assert.equal(els[1].el.style.left, '80px');
    assert.equal(els[2].el.style.left, '80px');
    assert.equal(els[3].el.style.left, '80px');
  });

  it('should align boxes by top edge', function() {
    manager.align(els, 'top');
    assert.equal(els[0].el.style.top, '');
    assert.equal(els[1].el.style.top, '50px');
    assert.equal(els[2].el.style.top, '');
    assert.equal(els[3].el.style.top, '50px');
  });

  it('should align boxes by right edge', function() {
    manager.align(els, 'right');
    assert.equal(els[0].el.style.left, '');
    assert.equal(els[1].el.style.left, '750px');
    assert.equal(els[2].el.style.left, '690px');
    assert.equal(els[3].el.style.left, '580px');
  });

  it('should align boxes by bottom edge', function() {
    manager.align(els, 'bottom');
    assert.equal(els[0].el.style.top, '439px');
    assert.equal(els[1].el.style.top, '');
    assert.equal(els[2].el.style.top, '479px');
    assert.equal(els[3].el.style.top, '419px');
  });

  it('should align boxes by horizontal center', function() {
    manager.align(els, 'hcenter');
    assert.equal(els[0].el.style.left, '108px');
    assert.equal(els[1].el.style.left, '443px');
    assert.equal(els[2].el.style.left, '413px');
    assert.equal(els[3].el.style.left, '358px');
  });

  it('should align boxes by vertical center', function() {
    manager.align(els, 'vcenter');
    assert.equal(els[0].el.style.top, '263px');
    assert.equal(els[1].el.style.top, '318px');
    assert.equal(els[2].el.style.top, '283px');
    assert.equal(els[3].el.style.top, '253px');
  });

  // --- Distribute

  it('should distribute boxes by horizontal center', function() {
    // todo: visually test!
    manager.distribute(els, 'hcenter');
    assert.equal(els[0].el.style.left, '');
    assert.equal(els[1].el.style.left, '430px');
    assert.equal(els[2].el.style.left, '605px');
    assert.equal(els[3].el.style.left, '255px');
  });

  it('should distribute boxes by vertical center', function() {
    manager.distribute(els, 'vcenter');
    assert.equal(els[0].el.style.top, '');
    assert.equal(els[1].el.style.top, '');
    assert.equal(els[2].el.style.top, '223px');
    assert.equal(els[3].el.style.top, '356px');
  });

  // --- Other

  it('should push all states so that they can undo together', function() {
    manager.align(els, 'left');
    assert.equal(els[0].states.length, 1);
    assert.equal(els[1].states.length, 1);
    assert.equal(els[2].states.length, 1);
    assert.equal(els[3].states.length, 1);
  });

});
