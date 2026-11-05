// Explicit saves only. Writing and profile details never leave this browser.
(function (root) {
  'use strict';
  let opening;
  function database() {
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open('deblock-local', 1);
      request.onupgradeneeded = () => {
        for (const name of ['entries', 'images', 'profile']) request.result.createObjectStore(name, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Close other deblock tabs and try again.'));
    }).catch(error => { opening = null; throw error; });
    return opening;
  }
  async function operation(store, method, value) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, method === 'put' ? 'readwrite' : 'readonly');
      const request = transaction.objectStore(store)[method](value);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error || request.error);
      transaction.onabort = () => reject(transaction.error || new Error('Save cancelled.'));
    });
  }
  root.DeblockLocalStorage = {
    all: store => operation(store, 'getAll'),
    get: (store, id) => operation(store, 'get', id),
    put: (store, value) => operation(store, 'put', value),
  };
  root.DeblockStorage ||= root.DeblockLocalStorage;
})(window);
