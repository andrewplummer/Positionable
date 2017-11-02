(function() {

  function getUiRoot(el) {
    return getUiContainer(el).shadowRoot;
  }

  function getUiElement(el, selector) {
    return getUiRoot(el).querySelector(selector);
  }

  function getUiContainer(el) {
    return el.querySelector('.positionable-extension-ui');
  }

  window.getUiRoot = getUiRoot;
  window.getUiElement = getUiElement;
  window.getUiContainer = getUiContainer;

})();

