
describe('ChromeStorageManager', function() {

  var manager, listener;

  setup(function() {
    chromeMock.apply();
    listener = new Listener();
    manager  = new ChromeStorageManager(listener);
  });

  teardown(function() {
    chromeMock.release();
    manager = null;
  });

  class Listener {

    constructor() {
      this.fetchEvents  = 0;
      this.saveEvents   = 0;
      this.removeEvents = 0;
    }

    onStorageDataFetched(data) {
      this.data = data;
      this.fetchEvents += 1;
    }

    onStorageDataSaved() {
      this.saveEvents += 1;
    }

    onStorageDataRemoved() {
      this.removeEvents += 1;
    }

  }

  // --- Getting

  it('should be able to fetch a single value', function() {
    chromeMock.setStoredData('foo', 'bar');
    manager.fetch('foo');
    assertEqual(listener.fetchEvents, 1);
    assertEqual(listener.data.foo, 'bar');
  });

  it('should be able to fetch multiple values', function() {
    chromeMock.setStoredData('foo', 'bar');
    chromeMock.setStoredData('bar', 'baz');
    manager.fetch(['foo', 'bar']);
    assertEqual(listener.fetchEvents, 1);
    assertEqual(listener.data.foo, 'bar');
    assertEqual(listener.data.bar, 'baz');
    assertEqual(Object.keys(listener.data).length, 2);
  });

  // --- Setting

  it('should be able to set a single value', function() {
    manager.save('foo', 'bar');
    assertEqual(listener.saveEvents, 1);
    assertEqual(chromeMock.getStoredData('foo'), 'bar');
  });

  it('should be able to set multiple values', function() {
    manager.save({ foo: 'bar', bar: 'baz' });
    assertEqual(listener.saveEvents, 1);
    assertEqual(chromeMock.getStoredData('foo'), 'bar');
    assertEqual(chromeMock.getStoredData('bar'), 'baz');
  });

  // --- Removing

  it('should be able to remove a single value', function() {
    chromeMock.setStoredData('foo', 'bar');
    manager.remove('foo');
    assertEqual(listener.removeEvents, 1);
    assertEqual(chromeMock.getStoredData('foo'), undefined);
    assertEqual(Object.keys(chromeMock.getStoredData()).length, 0);
  });

  it('should be able to remove multiple values', function() {
    chromeMock.setStoredData('foo', 'bar');
    chromeMock.setStoredData('bar', 'baz');
    chromeMock.setStoredData('boo', 'hoo');
    manager.remove(['foo', 'bar']);
    assertEqual(listener.removeEvents, 1);
    assertEqual(chromeMock.getStoredData('foo'), undefined);
    assertEqual(chromeMock.getStoredData('bar'), undefined);
    assertEqual(chromeMock.getStoredData('boo'), 'hoo');
    assertEqual(Object.keys(chromeMock.getStoredData()).length, 1);
  });

});
