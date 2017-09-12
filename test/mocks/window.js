
function withMockedWindowEvents(fn) {
  var mock = new WindowFunctionMock([
    'confirm',
    'prompt'
  ])
  fn(mock);
  mock.release();
}

class WindowFunctionMock {

  constructor(props) {
    this.props   = props;
    this.calls   = {};
    this.natives = {};
    this.setup();
  }

  getCalls(prop) {
    return this.calls[prop];
  }

  setup() {
    this.props.forEach(prop => {
      this.calls[prop] = 0;
      this.natives[prop] = window[prop];
      window[prop] = () => {
        this.calls[prop] += 1;
      };
    });
  }

  release() {
    this.props.forEach(prop => {
      window[prop] = this.natives[prop];
    });
  }

}
