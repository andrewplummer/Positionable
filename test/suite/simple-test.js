'use strict';

(function() {

  function sum(arr, fn) {
    return arr.reduce((sum, el) => sum + fn(el), 0);
  }

  class TestSuite {

    constructor(description, fn, focused, skipped) {
      this.description = description;
      this.fn          = fn;
      this.focused     = !!focused;
      this.skipped     = !!skipped;

      this.setupBlocks = [];
      this.teardownBlocks = [];
      this.tests = [];
    }

    // --- Globals

    it(description, fn) {
      this.tests.push(new Test(description, fn));
    }

    fit(description, fn) {
      this.tests.push(new Test(description, fn, true));
    }

    xit(description, fn) {
      this.tests.push(new Test(description, fn, false, true));
    }

    setup(fn) {
      this.setupBlocks.push(fn);
    }

    teardown(fn) {
      this.teardownBlocks.push(fn);
    }

    bindGlobals() {
      window.it       = this.it.bind(this);
      window.fit      = this.fit.bind(this);
      window.xit      = this.xit.bind(this);
      window.setup    = this.setup.bind(this);
      window.teardown = this.teardown.bind(this);
    }

    unbindGlobals() {
      window.it       = null;
      window.fit      = null;
      window.xit      = null;
      window.setup    = null;
      window.teardown = null;
    }

    // --- Running

    init(runArgs) {
      if (this.skipped) {
        return;
      }
      this.bindGlobals();
      this.fn.apply(this, runArgs);
      this.unbindGlobals();
    }

    run() {
      this.tests.forEach(test => {
        if (!test.skipped) {
          this.runSetup();
          test.run()
          this.runTeardown();
        }
      });
    }

    runSetup() {
      this.setupBlocks.forEach(fn => fn());
    }

    runTeardown() {
      this.teardownBlocks.forEach(fn => fn());
    }

    // --- Skipping

    setSkipped() {
      this.skipped = true;
    }

    setUnfocusedTestsSkipped() {
      this.tests.forEach(t => t.setSkippedIfNotFocused());
    }

    // --- Totals

    getTestTotal(type) {
      switch (type) {
        case 'skipped': return sum(this.tests, t =>  t.skipped);
        case 'focused': return sum(this.tests, t =>  t.focused);
        case 'passed':  return sum(this.tests, t =>  t.passed);
        case 'failed':  return sum(this.tests, t => !t.passed && !t.skipped);
      }
    }

    // --- Output

    outputFailures(parent) {
      var failed = this.getTestTotal('failed');
      if (!failed) {
        return;
      }
      var el = document.createElement('div');
      el.className = 'test-suite';
      this.outputHeader(el);
      this.tests.forEach(test => test.outputFailures(el));
      parent.appendChild(el);
    }

    outputHeader(parent) {
      var header = document.createElement('h2');
      header.className = 'test-suite-header';
      header.textContent = this.description;
      parent.appendChild(header);
    }

  }

  class Test {

    constructor(description, fn, focused, skipped) {
      this.description = description;
      this.focused = !!focused;
      this.skipped = !!skipped;
      this.passed = false;
      this.fn = fn;
      this.results = [];
    }

    // --- Running

    run() {
      window.assert = this.assert;
      this.fn();
      if (!this.results.length) {
        this.results.push(new TestResult(false, 'no assertions run!'));
      }
      window.assert = null;
      this.passed = this.results.every(t => t.passed);
    }

    setSkippedIfNotFocused() {
      if (!this.focused) {
        this.skipped = true;
      }
    }

    assertEqual(arg1, arg2) {
      var msg = `${arg1} should equal ${arg2}`;
      this.results.push(new TestResult(arg1 === arg2, msg));
    }

    assertTrue(arg1) {
      var msg = `${arg1} should be true`;
      this.results.push(new TestResult(!!arg1, msg));
    }

    assertNull(arg) {
      this.results.push(new TestResult(arg == null, arg + ' should be null'));
    }

    assertUndefined(arg) {
      this.results.push(new TestResult(arg === undefined, arg + ' should be undefined'));
    }

    assertExists(arg) {
      this.results.push(new TestResult(arg != null, arg + ' should not be null or undefined'));
    }

    assertMatch(arg, reg) {
      this.results.push(new TestResult(reg.test(arg), arg + ' should match ' + reg));
    }

    assertEqualWithTolerance(arg1, arg2, tolerance) {
      var msg  = `${arg1} should be within ${tolerance} of ${arg2}`;
      var pass = (arg1 >= arg2 - tolerance) && (arg1 <= arg2 + tolerance);
      this.results.push(new TestResult(pass, msg));
    }

    get assert() {
      return {
        equal: this.assertEqual.bind(this),
        match: this.assertMatch.bind(this),
        isTrue: this.assertTrue.bind(this),
        isNull: this.assertNull.bind(this),
        exists: this.assertExists.bind(this),
        isUndefined: this.assertUndefined.bind(this),
        equalWithTolerance: this.assertEqualWithTolerance.bind(this)
      }
    }

    // --- Output

    outputFailures(parent) {
      if (this.skipped || this.passed) {
        return;
      }
      var el = document.createElement('div');
      el.className = 'test-failures';
      this.outputHeader(el);
      this.outputAssertions(el);
      parent.appendChild(el);
    }

    outputHeader(parent) {
      var el = document.createElement('h3');
      el.className = 'test-results-header';
      el.textContent = this.description;
      parent.appendChild(el);
    }

    outputAssertions(parent) {
      var list = document.createElement('ol');
      list.className = 'text-failure-list';
      this.results.forEach(r => {
        if (r.passed) {
          this.outputPass(list);
        } else {
          this.outputFailure(list, r);
        }
      });
      parent.appendChild(list);
    }

    outputPass(list) {
      var item = document.createElement('li');
      item.textContent = 'pass';
      list.appendChild(item);
    }

    outputFailure(list, result) {
      var item = document.createElement('li');
      item.textContent = result.msg;
      list.appendChild(item);
    }

  }

  class TestResult {

    constructor(passed, msg) {
      this.passed = passed;
      this.msg = msg;
    }

  }

  class TestRunner {

    constructor() {
      this.suites = [];
      this.bindGlobals();
    }

    // --- Globals

    describe(description, fn) {
      this.suites.push(new TestSuite(description, fn));
    }

    fdescribe(description, fn) {
      this.suites.push(new TestSuite(description, fn, true));
    }

    xdescribe(description, fn) {
      this.suites.push(new TestSuite(description, fn, false, true));
    }

    bindGlobals() {
      window.describe  = this.describe.bind(this);
      window.fdescribe = this.fdescribe.bind(this);
      window.xdescribe = this.xdescribe.bind(this);
    }

    // --- Running

    run() {
      var runArgs = arguments;
      this.startTime = new Date();

      // Prevent suites from executing if there are focused suites.
      this.checkUnfocusedSuites();

      // Run suite blocks.
      this.suites.forEach(suite => suite.init(runArgs));

      // Prevent tests from executing if there are focused tests in other suites.
      this.checkUnfocusedTests();

      // Run all remaining tests.
      this.suites.forEach(suite => suite.run());

      this.runTime = new Date() - this.startTime;
      this.output(document.body);
    }

    // --- Focused

    checkUnfocusedSuites() {
      var unfocused = this.suites.filter(s => !s.focused);
      if (unfocused.length < this.suites.length) {
        unfocused.forEach(s => s.setSkipped());
      }
    }

    checkUnfocusedTests() {
      var focusedTestTotal = this.getTestTotal('focused');
      if (focusedTestTotal) {
        this.suites.forEach(s => s.setUnfocusedTestsSkipped());
      }
    }

    // --- Totals

    getSuitesSkipped() {
      return sum(this.suites, s => s.skipped);
    }

    getTestTotal(type) {
      return sum(this.suites, s => s.getTestTotal(type));
    }

    // --- Output

    output() {
      this.outputTotals(document.body);
      this.outputSuiteResults(document.body);
    }

    outputSuiteResults(parent) {
      this.suites.forEach(suite => suite.outputFailures(parent));
    }

    outputTotals(parent) {
      var el = document.createElement('div');
      el.className = 'test-totals';

      var passed =  this.getTestTotal('passed');
      var failed =  this.getTestTotal('failed');
      var skipped = this.getTestTotal('skipped');

      var suitesSkipped      = this.getSuitesSkipped();
      var suitesSkippedLabel = suitesSkipped === 1 ? 'suite skipped' : 'suites skipped';

      this.outputFinalResult(el, failed);
      this.outputTotal(el, passed, 'passed');
      this.outputTotal(el, failed, 'failed')
      this.outputTotal(el, skipped, 'skipped', true);
      this.outputTotal(el, suitesSkipped, suitesSkippedLabel, true);
      this.outputRuntime(el);
      parent.appendChild(el);
    }

    outputFinalResult(parent, failed) {
      var el = document.createElement('h2');
      el.className = failed ? 'tests-failed' : 'tests-passed';
      el.textContent = failed ? 'Tests failed!' : 'Passed';
      parent.appendChild(el);
    }

    outputTotal(parent, total, label, canSkip) {
      if (!total && canSkip) {
        return;
      }
      var el = document.createElement('h4');
      el.textContent = total + ' ' + label;
      parent.appendChild(el);
    }

    outputRuntime(parent) {
      var el = document.createElement('h4');
      el.textContent = 'Runtime: ' + this.runTime + 'ms';
      el.className = 'test-runtime';
      parent.appendChild(el);
    }
  }

  window.testRunner = new TestRunner();

})();
