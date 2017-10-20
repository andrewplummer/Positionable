

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

function fireMetaMouseDown(el, x, y) {
  fireMouseDown(el, x, y, { metaKey: true });
}

function fireContextMenu(el, x, y, opt) {
  fireMouseEvent('contextmenu', el, x, y, opt);
}

/*-------------------------] Drag Events [--------------------------*/

function fireDragElement(el, coords, opt) {
  var x, y;
  for (let i = 0; i < coords.length; i += 2) {
    x = coords[i];
    y = coords[i + 1];
    if (i === 0) {
      fireMouseDown(el, x, y, opt);
      fireDocumentMouseMove(x, y, opt);
    } else {
      fireDocumentMouseMove(x, y, opt);
    }
  }
  fireDocumentMouseUp(x, y, opt);
  if (opt.ctrlKey) {
    fireContextMenu(el, x, y, opt);
  }
}

function dragElement(el) {
  var coords = Array.prototype.slice.call(arguments, 1);
  fireDragElement(el, coords, {});
}

function shiftDragElement(el) {
  var coords = Array.prototype.slice.call(arguments, 1);
  fireDragElement(el, coords, { shiftKey: true });
}

function ctrlDragElement(el) {
  var coords = Array.prototype.slice.call(arguments, 1);
  fireDragElement(el, coords, { ctrlKey: true });
}

function metaDragElement(el) {
  var coords = Array.prototype.slice.call(arguments, 1);
  fireDragElement(el, coords, { metaKey: true });
}

function shiftCtrlDragElement(el) {
  var coords = Array.prototype.slice.call(arguments, 1);
  fireDragElement(el, coords, { shiftKey: true, ctrlKey: true });
}

function fireDocumentMouseMove(x, y, opt) {
  fireMouseMove(document.documentElement, x, y, opt);
}

function fireDocumentMouseUp(x, y, opt) {
  fireMouseUp(document.documentElement, x, y, opt);
}

function fireDocumentShiftMouseMove(x, y) {
  fireDocumentMouseMove(x, y, { shiftKey: true });
}

function fireDocumentShiftMouseUp(x, y) {
  fireDocumentMouseUp(x, y, { shiftKey: true });
}

function fireDocumentMetaMouseMove(x, y) {
  fireDocumentMouseMove(x, y, { metaKey: true });
}

function fireDocumentMetaMouseUp(x, y) {
  fireDocumentMouseUp(x, y, { metaKey: true });
}

function fireDocumentCtrlMouseMove(x, y) {
  fireDocumentMouseMove(x, y, { ctrlKey: true });
}

function fireDocumentCtrlMouseUp(x, y) {
  fireDocumentMouseUp(x, y, { ctrlKey: true });
}

/*-------------------------] Click Events [--------------------------*/

function clickElement(el, opt) {
  fireMouseDown(el, 0, 0, opt);
  fireMouseUp(el, 0, 0, opt);
  fireClick(el, 0, 0, opt)
}

function shiftClickElement(el) {
  clickElement(el, { shiftKey: true });
}

function ctrlClickElement(el) {
  clickElement(el, { ctrlKey: true });
  fireContextMenu(el, 0, 0, { ctrlKey: true });
}

/*-------------------------] Key Events [--------------------------*/

function fireKeyEvent(type, el, key, opt) {
  opt = Object.assign({
    key: key,
    view: window,
    bubbles: true,
    cancelable: true
  }, opt);
  var evt = new KeyboardEvent(type, opt)
  el.dispatchEvent(evt);
}

function fireKeyDown(el, key, opt) {
  fireKeyEvent('keydown', el, key, opt);
}

function fireKeyUp(el, key, opt) {
  fireKeyEvent('keyup', el, key, opt);
}

function fireDocumentKeyDown(key, opt) {
  fireKeyDown(document.documentElement, key, opt);
}

function fireDocumentShiftKeyDown(key) {
  fireKeyDown(document.documentElement, key, { shiftKey: true });
}

function fireDocumentMetaKeyDown(key) {
  fireKeyDown(document.documentElement, key, { metaKey: true });
}

function fireDocumentKeyUp(key, opt) {
  fireKeyUp(document.documentElement, key, opt);
}

function fireDocumentMetaKeyUp(key) {
  fireKeyUp(document.documentElement, key, { metaKey: true });
}

/*-------------------------] Form Events [--------------------------*/

function fireSubmitEvent(el) {
  el.dispatchEvent(new CustomEvent('submit'));
}

function fireResetEvent(el) {
  el.dispatchEvent(new CustomEvent('reset'));
}
