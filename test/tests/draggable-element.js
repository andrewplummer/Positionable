
describe('DraggableElement', function(uiRoot) {

  it('should update position when dragged', function() {
    var el = appendAbsoluteBox();
    var draggableElement = new DraggableElement(el);
    dragElement(el, 100, 100, 200, 200);
    assert.equal(el.style.left, '200px');
  });

});
