

function appendFixture(classNames, parent) {
  parent = parent || document.getElementById('element-fixtures');
  var el = document.createElement('div');
  classNames.filter(n => n).forEach(n => el.classList.add(n));
  parent.appendChild(el);
  return el;
}

function appendAbsoluteBox(className, parent) {
  return appendFixture(['box', 'absolute-box', className], parent);
}

function appendFixedBox(className, parent) {
  return appendFixture(['box', 'fixed-box', className], parent);
}

function appendRelativeBox(className, parent) {
  return appendFixture(['box', 'relative-box', className], parent);
}

function appendStaticBox(className, parent) {
  return appendFixture(['box', 'static-box', className], parent);
}

function appendInvertedBox(className, parent) {
  return appendFixture(['box', 'inverted-box', className], parent);
}

function appendNestedBox() {
  var container = appendRelativeBox();
  return appendFixture(['box', 'absolute-box'], container);
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

