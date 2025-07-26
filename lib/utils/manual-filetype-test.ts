import { parseFile, detectFileType } from './filetype';

// Helper to simulate a file upload in a browser-like environment
async function manualTest() {
  // JSONL test
  const jsonlContent = '{"a":1,"b":2}\n{"a":3,"b":4}';
  const jsonlFile = new File([jsonlContent], 'test.jsonl', { type: 'application/json' });
  const jsonlType = detectFileType(jsonlFile);
  const jsonlParsed = await parseFile(jsonlFile);
  console.log('JSONL type:', jsonlType);
  console.log('JSONL parsed:', jsonlParsed);

  // CSV test
  const csvContent = 'a,b\n1,2\n3,4';
  const csvFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
  const csvType = detectFileType(csvFile);
  const csvParsed = await parseFile(csvFile);
  console.log('CSV type:', csvType);
  console.log('CSV parsed:', csvParsed);

  // Excel test (skipped, as it requires binary data and browser FileReader)
}

manualTest();
