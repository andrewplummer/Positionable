

/*-------------------------] Mouse Events [--------------------------*/

function fireMouseEvent(type, el, x, y, opt) {
  opt = Object.assign({
    clientX: x || 0,
    clientY: y || 0,
    view: window,
    bubbles: true,
    cancelable: true
  }, opt);
  var evt = new MouseEvent(type, opt)
  el.dispatchEvent(evt);
}

function fireMouseDown(el, x, y, opt) {
  fireMouseEvent('mousedown', el, x, y, opt);
}

function fireMouseMove(el, x, y, opt) {
  fireMouseEvent('mousemove', el, x, y, opt);
}

function fireMouseUp(el, x, y, opt) {
  fireMouseEvent('mouseup', el, x, y, opt);
}

function fireClick(el, x, y, opt) {
  fireMouseEvent('click', el, x, y, opt);
}

function fireDoubleClick(el, x, y, opt) {
  fireMouseEvent('dblclick', el, x, y, opt);
}

function fireMouseOver(el, x, y, opt) {
  fireMouseEvent('mouseover', el, x, y, opt);
}

function fireMouseOut(el, x, y, opt) {
  fireMouseEvent('mouseout', el, x, y, opt);
}

function fireMouseEnter(el, x, y, opt) {
  fireMouseEvent('mouseenter', el, x, y, opt);
}

function fireMouseLeave(el, x, y, opt) {
  fireMouseEvent('mouseleave', el, x, y, opt);
}

function fireMouseDownUp(el, x, y, opt) {
  fireMouseDown(el, x, y, opt);
  fireMouseUp(el, x, y, opt);
}

function fireShiftMouseDown(el, x, y) {
  fireMouseDown(el, x, y, { shiftKey: true });
}

function fireShiftMouseDownUp(el, x, y) {
  fireMouseDown(el, x, y, { shiftKey: true });
  fireMouseUp(el, x, y, { shiftKey: true });
}

/*-------------------------] Drag Events [--------------------------*/

function dragElement(el, startX, startY, moveX, moveY, stopX = moveX, stopY = moveY, opt = {}) {
  fireMouseDown(el, startX, startY, opt);
  if (startX !== moveX || startY !== moveY) {
    fireDocumentMouseMove(moveX, moveY, opt);
  }
  fireDocumentMouseUp(stopX, stopY, opt);
}

function shiftDragElement(el, startX, startY, moveX, moveY, stopX, stopY) {
  dragElement(el, startX, startY, moveX, moveY, stopX, stopY, { shiftKey: true });
}

function fireDocumentMouseMove(x, y, opt) {
  fireMouseMove(document.documentElement, x, y, opt);
}

function fireDocumentMouseUp(x, y, opt) {
  fireMouseUp(document.documentElement, x, y, opt);
}

function fireShiftDocumentMouseMove(x, y) {
  fireDocumentMouseMove(x, y, { shiftKey: true });
}

function fireShiftDocumentMouseUp(x, y) {
  fireDocumentMouseUp(x, y, { shiftKey: true });
}

/*-------------------------] Form Events [--------------------------*/

function fireSubmitEvent(el) {
  el.dispatchEvent(new CustomEvent('submit'));
}

function fireResetEvent(el) {
  el.dispatchEvent(new CustomEvent('reset'));
}
