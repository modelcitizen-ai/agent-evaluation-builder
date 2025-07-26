// Debug API route for checking localStorage functionality
// This route doesn't use localStorage itself, just returns useful debugging info

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get environment information
    const environment = {
      nodeVersion: process.version,
      nextVersion: process.env.NEXT_RUNTIME || 'unknown',
      environment: process.env.NODE_ENV,
      platform: process.platform,
      turbo: process.env.TURBOPACK === '1' ? 'enabled' : 'disabled',
      time: new Date().toISOString(),
    };

    // Check if client-side localStorage access would be impacted
    const isCrossSite = request.headers.get('sec-fetch-site') === 'cross-site';
    const isIframe = request.headers.get('sec-fetch-dest') === 'iframe';
    const hasSecurityHeaders = !!request.headers.get('content-security-policy');

    return NextResponse.json({
      success: true,
      environment,
      clientHints: {
        isCrossSite,
        isIframe,
        hasSecurityHeaders,
        userAgent: request.headers.get('user-agent'),
      },
      localStorageStatus: {
        message: "Check browser console for actual localStorage status - this is server-side only",
        howToCheck: "Open browser DevTools (F12) and run 'localStorage' in the console",
        commonIssues: [
          "Third-party cookie blocking",
          "Private browsing mode",
          "Content Security Policy restrictions",
          "Storage quota exceeded"
        ]
      }
    });
  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug API error',
        errorDetails: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
