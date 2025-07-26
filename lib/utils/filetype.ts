import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ParsedFile = {
  data: any[];
  columns: string[];
  fileType: 'csv' | 'excel' | 'jsonl' | 'unknown';
};

export function detectFileType(file: File): 'csv' | 'excel' | 'jsonl' | 'unknown' {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'excel';
  if (name.endsWith('.jsonl')) return 'jsonl';
  return 'unknown';
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const fileType = detectFileType(file);
  if (fileType === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          const data = results.data as any[];
          const columns = data.length > 0 ? Object.keys(data[0] as object) : [];
          resolve({ data, columns, fileType });
        },
        error: reject,
      });
    });
  }
  if (fileType === 'excel') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        const columns = json.length > 0 ? Object.keys(json[0] as object) : [];
        resolve({ data: json, columns, fileType });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  if (fileType === 'jsonl') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter(Boolean);
          const data = lines.map(line => JSON.parse(line));
          const columns = data.length > 0 ? Object.keys(data[0] as object) : [];
          resolve({ data, columns, fileType });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  // Unknown file type
  return Promise.resolve({ data: [], columns: [], fileType: 'unknown' });
}

export async function detectFileTypeAndParse(file: File) {
  return parseFile(file);
}
