
describe('PositionableElementAlignmentManager', function(uiRoot) {

  var els, manager;

  setup(function() {
    setupElements();
    manager = new PositionableElementAlignmentManager();
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  function setupElements() {
    els = [];
    els.push(new PositionableElement(appendAbsoluteBox('align-box-1')));
    els.push(new PositionableElement(appendAbsoluteBox('align-box-2')));
    els.push(new PositionableElement(appendAbsoluteBox('align-box-3')));
  }

  it('should align boxes by left edge', function() {
    manager.align(els, 'left');
    assert.equal(els[0].el.style.left, '');
    assert.equal(els[1].el.style.left, '80px');
    assert.equal(els[2].el.style.left, '80px');
  });

  it('should align boxes by top edge', function() {
    manager.align(els, 'top');
    assert.equal(els[0].el.style.top, '');
    assert.equal(els[1].el.style.top, '50px');
    assert.equal(els[2].el.style.top, '');
  });

  it('should align boxes by right edge', function() {
    manager.align(els, 'right');
    assert.equal(els[0].el.style.left, '');
    assert.equal(els[1].el.style.left, '750px');
    assert.equal(els[2].el.style.left, '690px');
  });

  it('should align boxes by bottom edge', function() {
    manager.align(els, 'bottom');
    assert.equal(els[0].el.style.top, '439px');
    assert.equal(els[1].el.style.top, '');
    assert.equal(els[2].el.style.top, '479px');
  });

  it('should align boxes by horizontal center', function() {
    manager.align(els, 'hcenter');
    assert.equal(els[0].el.style.left, '223px');
    assert.equal(els[1].el.style.left, '558px');
    assert.equal(els[2].el.style.left, '528px');
  });

});
