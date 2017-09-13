

function appendFixture(classNames) {
  var el = document.getElementById('element-fixtures');
  var box = document.createElement('div');
  classNames.filter(n => n).forEach(n => box.classList.add(n));
  el.appendChild(box);
  return box;
}

function appendAbsoluteBox(className) {
  return appendFixture(['box', 'absolute-box', className]);
}

function appendFixedBox(className) {
  return appendFixture(['box', 'fixed-box', className]);
}

function appendRelativeBox(className) {
  return appendFixture(['box', 'relative-box', className]);
}

function appendStaticBox(className) {
  return appendFixture(['box', 'static-box', className]);
}

function appendInvertedBox(className) {
  return appendFixture(['box', 'inverted-box', className]);
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

function appendChild(el, tag) {
  var child = document.createElement(tag);
  el.appendChild(child);
  return child;
}

