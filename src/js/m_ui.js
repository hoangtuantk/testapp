function createUiController() {
  const elements = {
    processingInfo: document.getElementById('processing-info'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    processBtn: document.getElementById('processBtn'),
    dbStatus: document.getElementById('dbStatus'),
    clearDbBtn: document.getElementById('clearDbBtn'),
  };

  // Hàm để tải file xuống
  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const controller = {
    showProcessing: () => {
      elements.processingInfo.classList.remove('hidden');
      elements.progressBar.style.width = '0%';
      elements.progressText.textContent = 'Đang khởi tạo...';
      elements.processBtn.disabled = true;
    },
    updateProgress: (percentage, linesProcessed) => {
      elements.progressBar.style.width = `${percentage}%`;
      elements.progressText.textContent = `Đã đọc ${linesProcessed.toLocaleString('vi-VN')} dòng... (${percentage}%)`;
    },
    updateStatus: (message) => {
      elements.progressBar.style.width = '100%';
      elements.progressText.textContent = message;
    },
    // Kích hoạt tải nhiều file
    triggerDownloads: (filesArray) => {
      if (filesArray.length === 0) {
        alert('Không tìm thấy dữ liệu nào phù hợp với các bộ lọc.');
        return;
      }

      alert(`Sẽ có ${filesArray.length} file được tải xuống.`);

      filesArray.forEach((file, index) => {
        // Thêm một khoảng trễ nhỏ giữa các lần tải để trình duyệt không chặn
        setTimeout(() => {
          downloadFile(file.fileName, file.fileContent);
        }, index * 500);
      });
    },
    updateDbStatus: (message, hasFile) => {
      elements.dbStatus.textContent = message;
      elements.processBtn.disabled = !hasFile;
      elements.clearDbBtn.classList.toggle('hidden', !hasFile);
    },
    reset: () => {
      elements.processingInfo.classList.add('hidden');
      elements.processBtn.disabled = false; // Luôn bật lại nút sau khi hoàn tất hoặc lỗi
    }
  };
  return controller;
}

export const uiController = createUiController();