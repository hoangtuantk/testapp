const DB_NAME = 'fileStorage';
const STORE_NAME = 'files';
const FILE_KEY = 'userDictionary';

let db;

// Mở hoặc tạo database
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('Lỗi khi mở IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
};

// Lưu file vào DB
const saveFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject('Database chưa được khởi tạo.');
    }
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file, FILE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Lỗi khi lưu file:', event.target.error);
      reject(event.target.error);
    };
  });
};

// Lấy file từ DB
const getFile = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject('Database chưa được khởi tạo.');
    }
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(FILE_KEY);

    request.onsuccess = (event) => {
      resolve(event.target.result); // Trả về file object hoặc undefined
    };
    request.onerror = (event) => {
      console.error('Lỗi khi lấy file:', event.target.error);
      reject(event.target.error);
    };
  });
};

// Xóa file khỏi DB
const clearData = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject('Database chưa được khởi tạo.');
    }
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(FILE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Lỗi khi xóa file:', event.target.error);
      reject(event.target.error);
    };
  });
};

export const dbManager = {
  initDB,
  saveFile,
  getFile,
  clearData
};