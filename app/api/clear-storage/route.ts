// API endpoint to clear localStorage (runs client-side code)

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clear localStorage</title>
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          line-height: 1.5;
        }
        h1 { color: #4f46e5; }
        .success { 
          background: #ecfdf5; 
          border-left: 4px solid #10b981;
          padding: 1rem;
          margin: 1rem 0;
        }
        .error { 
          background: #fef2f2; 
          border-left: 4px solid #ef4444;
          padding: 1rem;
          margin: 1rem 0;
        }
        button {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover { background: #4338ca; }
        a {
          color: #4f46e5;
          text-decoration: none;
        }
        a:hover { text-decoration: underline; }
        .result {
          margin-top: 1rem;
          display: none;
        }
      </style>
    </head>
    <body>
      <h1>Human Evaluation Builder</h1>
      <h2>localStorage Manager</h2>
      <p>Use this utility to clear all stored data from your browser's localStorage.</p>
      
      <button id="clearBtn">Clear localStorage</button>
      <div id="result" class="result"></div>
      
      <p>
        <a href="/">Return to Home</a> | 
        <a href="/data-scientist">Go to My Projects</a>
      </p>

      <script>
        document.getElementById('clearBtn').addEventListener('click', function() {
          try {
            const count = localStorage.length;
            const keys = Object.keys(localStorage);
            
            // Create a backup just in case
            const backup = {};
            keys.forEach(key => {
              backup[key] = localStorage.getItem(key);
            });
            
            // Clear storage
            localStorage.clear();
            
            // Show success message
            const resultEl = document.getElementById('result');
            resultEl.className = 'result success';
            resultEl.style.display = 'block';
            resultEl.innerHTML = '<strong>Success!</strong> Cleared ' + count + ' items from localStorage.<br>Refresh the page to see the empty state.';
            
            console.log('Cleared localStorage. Items removed:', keys);
          } catch (error) {
            // Show error message
            const resultEl = document.getElementById('result');
            resultEl.className = 'result error';
            resultEl.style.display = 'block';
            resultEl.innerHTML = '<strong>Error:</strong> ' + error.message;
            
            console.error('Error clearing localStorage:', error);
          }
        });
      </script>
    </body>
    </html>
    `,
    {
      status: 200,
      headers: {
        'content-type': 'text/html',
      },
    }
  );
}
