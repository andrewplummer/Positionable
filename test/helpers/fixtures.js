(function() {

  function appendBox(className, parent) {
    var el, classes, id;

    className = className || 'absolute-box';
    classes = className.split(' ');
    id = classes[0];

    if (!isPositioningBox(classes[0])) {
      classes.unshift('absolute-box');
    }

    classes.unshift('box');

    parent = parent || getFixturesContainer();

    el = createDiv();
    el.id = id;
    classes.forEach(c => el.classList.add(c));
    parent.appendChild(el);
    return el;
  }

  function appendNestedBox(className, parentClassName) {
    var el = appendBox(parentClassName || 'relative-box');
    return appendBox(className, el);
  }

  function appendSvg() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '600');
    svg.setAttribute('height', '250');
    getFixturesContainer().appendChild(svg);
  }

  function getFixturesContainer() {
    return document.getElementById('element-fixtures');
  }

  function isPositioningBox(className) {
    return className === 'absolute-box' ||
           className === 'relative-box' ||
           className === 'static-box' ||
           className === 'fixed-box';
  }

  function releaseAppendedFixtures() {
    document.getElementById('element-fixtures').innerHTML = '';
  }

  /*-------------------------] Generic Elements [--------------------------*/

  function createDiv() {
    return document.createElement('div');
  }

  function createLink(href) {
    var el = document.createElement('a');
    el.href = href;
    return el;
  }

  function appendByTag(el, tag) {
    var child = document.createElement(tag);
    el.appendChild(child);
    return child;
  }

  window.appendBox = appendBox;
  window.appendSvg = appendSvg;
  window.appendNestedBox = appendNestedBox;
  window.releaseAppendedFixtures = releaseAppendedFixtures;
  window.createDiv = createDiv;
  window.createLink = createLink;
  window.appendByTag = appendByTag;

})();
