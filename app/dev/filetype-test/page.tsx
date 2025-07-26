"use client";
import React, { useState } from "react";
import { detectFileTypeAndParse } from "@/lib/utils/filetype";

export default function FiletypeTestPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const parseResult = await detectFileTypeAndParse(file);
      setResult(parseResult);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Filetype Utility Test Page</h1>
      <p>Upload a CSV, Excel, or JSONL file to test parsing logic.</p>
      <input type="file" accept=".csv,.xlsx,.xls,.jsonl,.txt,.json" onChange={handleFileChange} />
      {loading && <p>Parsing...</p>}
      {error && <pre style={{ color: "red" }}>{error}</pre>}
      {result && (
        <div style={{ marginTop: 24 }}>
          <h2>Detected Filetype: {result.type}</h2>
          <h3>Parsed Data (first 3 rows):</h3>
          <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 4 }}>
            {JSON.stringify(result.data?.slice?.(0, 3) || result.data, null, 2)}
          </pre>
          {result.columns && (
            <>
              <h3>Columns:</h3>
              <pre>{JSON.stringify(result.columns, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
