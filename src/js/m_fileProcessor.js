export function processFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const data = new Map();

      for (const line of lines) {
        if (line.trim() === '') continue;

        const parts = line.split('=');
        if (parts.length < 2) continue;

        const originalChinese = parts[0].trim();
        const vietnamese = parts.slice(1).join('=').trim();
        const cleanedChinese = originalChinese.replace(/[!,.?" "]/g, '');

        if (!data.has(cleanedChinese)) {
          data.set(cleanedChinese, {
            originals: new Set(),
            translations: []
          });
        }

        const entry = data.get(cleanedChinese);
        entry.originals.add(originalChinese);
        entry.translations.push(...vietnamese.split(/[/;]/).map(t => t.trim()));
      }

      resolve(data);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsText(file, 'UTF-8');
  });
}