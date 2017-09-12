
function getUiRoot(el) {
  return el.querySelector('.positionable-extension-ui').shadowRoot;
}

function getUiElement(el, selector) {
  return getUiRoot(el).querySelector(selector);
}
