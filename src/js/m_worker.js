// --- Helper Functions & Dictionaries ---

// Regex để kiểm tra một chuỗi có chứa bất kỳ chữ/số nào không (Hán, Latin, etc.)
const HAS_LETTERS_OR_NUMBERS_REGEX = /[\p{L}\p{N}]/u;

// Hàm loại bỏ tất cả ký tự không phải chữ hoặc số
const stripSymbolsAndPunctuation = (text) => {
  return text.replace(/[^\p{L}\p{N}]/gu, '');
};

// Từ điển lỗi chính tả Tiếng Việt phổ biến (sai:đúng)
const VIETNAMESE_MISSPELLINGS = {
  'hổ trợ': 'hỗ trợ',
  'mủi tên': 'mũi tên',
  'sáng lạn': 'xán lạn',
  'dữ dội': 'dữ dội', // Đôi khi bị viết là 'giữ dội'
  'giả thuyết': 'giả thuyết', // Đôi khi bị viết là 'dả thuyết'
  'sáp nhập': 'sáp nhập', // Đôi khi bị viết là 'sát nhập'
  'vô hình chung': 'vô hình trung',
  'dành giật': 'giành giật',
  'chẩn đoán': 'chẩn đoán',
  'chuẩn đoán': 'chẩn đoán', // Lỗi phổ biến
  'đãi ngộ': 'đãi ngộ',
  'lãi xuất': 'lãi suất',
  'tham quan': 'tham quan',
  'liên quan': 'liên quan'
};
const misspellingsRegex = new RegExp(`\\b(${Object.keys(VIETNAMESE_MISSPELLINGS).join('|')})\\b`, 'gi');


// --- Main Worker Logic ---
self.onmessage = async (e) => {
  const { file } = e.data;
  const fileSize = file.size;
  let bytesRead = 0;
  let linesProcessed = 0;

  const stream = file.stream();
  const reader = stream.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream({
    transform(chunk, controller) {
      let buffer = '';
      const processChunk = (text) => {
        buffer += text;
        let lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach(line => controller.enqueue(line));
      };
      processChunk(chunk);
    }
  })).getReader();

  // --- Data Structures for Results ---
  const group_formatting_errors = [];
  const punctuationVariantsMap = new Map();
  // Các nhóm cũ vẫn giữ lại
  const identicalA_Map = new Map();
  const group_duplicates_in_B = [];
  // Khoảng trắng giữa chữ TRUNG
  const group_spaces_in_A = [];

  try {
    while (true) {
      const { done, value: line } = await reader.read();
      if (done) break;

      linesProcessed++;
      bytesRead += new Blob([line]).size;

      if (linesProcessed % 25000 === 0) {
        self.postMessage({ type: 'PROGRESS', payload: { percentage: Math.round((bytesRead / fileSize) * 100), linesProcessed } });
      }

      // --- Logic for Group 3: Formatting Errors ---
      const trimmedLine = line.trim();
      if (trimmedLine === '') {
        // group_formatting_errors.push('[DÒNG TRỐNG]'); // Có thể thêm nếu muốn
        continue;
      }
      if (!trimmedLine.includes('=')) {
        group_formatting_errors.push(line);
        continue;
      }
      const parts = trimmedLine.split('=');
      const originalA = parts[0].trim();
      const originalB = parts.slice(1).join('=').trim();

      if (originalA === '' || !HAS_LETTERS_OR_NUMBERS_REGEX.test(originalA)) {
        group_formatting_errors.push(line);
        continue;
      }

      // --- Logic for Group 2: Punctuation Variants of [A] ---
      const cleanedA = stripSymbolsAndPunctuation(originalA);
      if (cleanedA) { // Chỉ xử lý nếu sau khi lọc còn lại chữ
        if (!punctuationVariantsMap.has(cleanedA)) {
          punctuationVariantsMap.set(cleanedA, []);
        }
        punctuationVariantsMap.get(cleanedA).push(line);
      }

      // --- Logic for new group: Spaces in [A] --- //
      // Regex này tìm một chữ Hán, theo sau là khoảng trắng, rồi đến một chữ Hán khác
      if (/\p{Script=Han}\s+\p{Script=Han}/u.test(originalA)) {
        group_spaces_in_A.push(line);
      }


      // --- Logic for legacy groups ---
      if (!identicalA_Map.has(originalA)) {
        identicalA_Map.set(originalA, []);
      }
      identicalA_Map.get(originalA).push(line);

      const b_parts = originalB.split(/[/;]/).map(t => t.trim());
      if (b_parts.length > 1) {
        if (new Set(b_parts).size !== b_parts.length) {
          group_duplicates_in_B.push(line);
        }
      }
    }

    self.postMessage({ type: 'STATUS_UPDATE', payload: 'Đọc file hoàn tất. Đang tổng hợp kết quả...' });

    // --- Finalize and Prepare Files ---
    const filesToExport = [];

    // Finalize Group 2
    const group_punctuation_variants = [];
    for (const variants of punctuationVariantsMap.values()) {
      if (variants.length > 1) {
        group_punctuation_variants.push(...variants, '--------------------');
      }
    }

    // Finalize legacy group
    const group_identical_A = [];
    for (const value of identicalA_Map.values()) {
      if (value.length > 1) {
        group_identical_A.push(...value);
      }
    }

    // Add results to export queue
    if (group_punctuation_variants.length > 0) {
      filesToExport.push({ fileName: 'A_la_bien_the_ky_tu.txt', fileContent: group_punctuation_variants.join('\n') });
    }
    if (group_formatting_errors.length > 0) {
      filesToExport.push({ fileName: 'Nhom_1_loi_dinh_dang.txt', fileContent: group_formatting_errors.join('\n') });
    }
    if (group_identical_A.length > 0) {
      filesToExport.push({ fileName: 'A_trung_lap_tuyet_doi.txt', fileContent: group_identical_A.join('\n') });
    }
    if (group_duplicates_in_B.length > 0) {
      filesToExport.push({ fileName: 'B_trung_lap_trong_dong.txt', fileContent: group_duplicates_in_B.join('\n') });
    }
    if (group_spaces_in_A.length > 0) {
      filesToExport.push({ fileName: 'A_co_khoang_trang_giua_chu.txt', fileContent: group_spaces_in_A.join('\n') });
    }

    self.postMessage({ type: 'DONE', payload: filesToExport });

  } catch (error) {
    console.error("Lỗi trong worker:", error);
    self.postMessage({ type: 'ERROR', payload: { message: error.message } });
  }
};