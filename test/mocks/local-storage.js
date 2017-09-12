
class MockLocalStorage {

  constructor() {
    this.clear();
  }

  getItem(key) {
    return this.data[key];
  }

  setItem(key, value) {
    this.data[key] = value;
  }

  removeItem(key) {
    delete this.data[key];
  }

  clear(key) {
    this.data = {};
  }

}
