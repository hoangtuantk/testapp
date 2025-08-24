import { uiController } from './m_ui.js';
import { dbManager } from './m_idb.js';

document.addEventListener('DOMContentLoaded', async () => {
  const fileInput = document.getElementById('fileInput');
  const processBtn = document.getElementById('processBtn');
  const clearDbBtn = document.getElementById('clearDbBtn');
  let worker;

  // --- Khởi tạo và kiểm tra IndexedDB khi tải trang ---
  try {
    await dbManager.initDB();
    const storedFile = await dbManager.getFile();
    if (storedFile) {
      uiController.updateDbStatus(`Đã lưu file "${storedFile.name}" (${(storedFile.size / 1024 / 1024).toFixed(2)} MB).`, true);
    } else {
      uiController.updateDbStatus('Chưa có file nào được lưu.', false);
    }
  } catch (error) {
    uiController.updateDbStatus('Lỗi: không thể truy cập bộ nhớ trình duyệt.', false);
    console.error("Lỗi IndexedDB:", error);
  }

  // --- Xử lý khi người dùng chọn file mới ---
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        await dbManager.saveFile(file);
        uiController.updateDbStatus(`Đã lưu file mới "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB).`, true);
        // Reset kết quả cũ nếu có
        uiController.reset();
      } catch (error) {
        uiController.updateDbStatus('Lỗi khi lưu file.', false);
      }
    }
  });

  // --- Nút xử lý chính ---
  processBtn.addEventListener('click', async () => {
    try {
      const file = await dbManager.getFile();
      if (file) {
        if (worker) {
          worker.terminate();
        }
        worker = new Worker(new URL('./m_worker.js', import.meta.url), { type: 'module' });

        uiController.showProcessing();
        worker.postMessage({ file }); // Gửi file từ DB cho worker

        worker.onmessage = (e) => {
          const { type, payload } = e.data;
          switch (type) {
            case 'PROGRESS':
              uiController.updateProgress(payload.percentage, payload.linesProcessed);
              break;
            case 'STATUS_UPDATE':
              uiController.updateStatus(payload);
              break;
            case 'DONE':
              uiController.triggerDownloads(payload);
              uiController.reset();
              break;
            case 'ERROR':
              alert(`Lỗi trong Worker: ${payload.message}`);
              uiController.reset();
              break;
          }
        };

        worker.onerror = (e) => {
          console.error('Worker error:', e);
          alert('Có lỗi nghiêm trọng xảy ra với trình xử lý.');
          uiController.reset();
        };

      } else {
        alert("Không có file nào trong bộ nhớ. Vui lòng tải lên một file.");
      }
    } catch (error) {
      alert('Lỗi khi lấy file từ bộ nhớ.');
      console.error(error);
    }
  });

  // --- Nút xóa file đã lưu ---
  clearDbBtn.addEventListener('click', async () => {
    if (confirm('Bạn có chắc muốn xóa file đã lưu khỏi trình duyệt?')) {
      try {
        await dbManager.clearData();
        uiController.updateDbStatus('Đã xóa file. Vui lòng tải lên file mới.', false);
        // Reset kết quả cũ nếu có
        uiController.reset();
      } catch (error) {
        alert('Lỗi khi xóa file.');
      }
    }
  });

});