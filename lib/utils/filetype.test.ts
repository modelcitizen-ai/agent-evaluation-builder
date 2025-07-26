import { parseFile, detectFileType, ParsedFile } from './filetype';

describe('filetype utility', () => {
  it('detects CSV filetype', () => {
    const file = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
    expect(detectFileType(file)).toBe('csv');
  });

  it('detects Excel filetype', () => {
    const file = new File([], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(detectFileType(file)).toBe('excel');
  });

  it('detects JSONL filetype', () => {
    const file = new File(['{"a":1}\n{"a":2}'], 'test.jsonl', { type: 'application/json' });
    expect(detectFileType(file)).toBe('jsonl');
  });

  it('detects unknown filetype', () => {
    const file = new File(['foo'], 'test.txt', { type: 'text/plain' });
    expect(detectFileType(file)).toBe('unknown');
  });

  it('parses JSONL file', async () => {
    const file = new File([
      '{"a":1,"b":2}\n{"a":3,"b":4}'
    ], 'test.jsonl', { type: 'application/json' });
    const result: ParsedFile = await parseFile(file);
    expect(result.fileType).toBe('jsonl');
    expect(result.data.length).toBe(2);
    expect(result.columns).toEqual(['a', 'b']);
    expect(result.data[0]).toEqual({ a: 1, b: 2 });
  });

  it('parses CSV file', async () => {
    const file = new File(['a,b\n1,2\n3,4'], 'test.csv', { type: 'text/csv' });
    const result: ParsedFile = await parseFile(file);
    expect(result.fileType).toBe('csv');
    expect(result.data.length).toBe(2);
    expect(result.columns).toEqual(['a', 'b']);
    expect(result.data[0]).toEqual({ a: '1', b: '2' });
  });

  // Excel parsing test is omitted here due to browser FileReader and binary requirements
});
