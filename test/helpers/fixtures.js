

function appendFixture(id, classNames, parent) {
  parent = parent || document.getElementById('element-fixtures');
  var el = document.createElement('div');
  el.id = id;
  classNames.filter(n => n).forEach(n => {
    n.split(' ').forEach(c => el.classList.add(c));
  });
  parent.appendChild(el);
  return el;
}

function appendAbsoluteBox(className, parent) {
  return appendFixture('absolute-box', ['box', 'absolute-box', className], parent);
}

function appendFixedBox(className, parent) {
  return appendFixture('fixed-box', ['box', 'fixed-box', className], parent);
}

function appendRelativeBox(className, parent) {
  return appendFixture('relative-box', ['box', 'relative-box', className], parent);
}

function appendStaticBox(className, parent) {
  return appendFixture('static-box', ['box', 'static-box', className], parent);
}

function appendInvertedBox(className, parent) {
  return appendFixture('inverted-box', ['box', 'inverted-box', className], parent);
}

function appendRotatedBox(className, parent) {
  return appendFixture('rotated-box', ['box', 'rotated-box', className], parent);
}

function appendTranslatedBox(className, parent) {
  return appendFixture('translated-box', ['box', 'translated-box', className], parent);
}

function appendTransformedBox(className, parent) {
  return appendFixture('transformed-box', ['box', 'transformed-box', className], parent);
}

function appendSubpixelTransformedBox(className, parent) {
  return appendFixture('subpixel-transformed-box', ['box', 'subpixel-transformed-box', className], parent);
}

function appendBackgroundImageBox(className, parent) {
  return appendFixture('background-image-box', ['box', 'absolute-box', 'background-image-box', className], parent);
}

function appendRotatedBackgroundImageBox(className, parent) {
  return appendFixture('rotated-background-box', ['box', 'absolute-box', 'rotated-box', 'background-image-box', className], parent);
}

function appendComplexBox(className, parent) {
  return appendFixture('complex-box', ['box', 'z-box', 'inverted-box', 'transformed-box', 'background-image-box', className], parent);
}

function appendNestedBox() {
  var container = appendRelativeBox();
  return appendFixture('nested-box', ['box', 'absolute-box'], container);
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

