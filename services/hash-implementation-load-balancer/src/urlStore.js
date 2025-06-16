const store = new Map();

if (!global._urlStore) {
  global._urlStore = store;
}

module.exports = {
  urlStore: global._urlStore,
};
