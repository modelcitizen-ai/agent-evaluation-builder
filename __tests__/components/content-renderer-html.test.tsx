/**
 * Test suite for HTML rendering functionality in ContentRenderer
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentRenderer from '@/components/content-renderer';

// Mock DOMPurify since it needs a DOM environment
jest.mock('dompurify', () => ({
  sanitize: jest.fn((html) => html), // Simple passthrough for testing
}));

describe('ContentRenderer HTML Support', () => {
  it('should render basic HTML content', () => {
    const htmlContent = '<p>This is <strong>bold</strong> text</p>';
    
    render(<ContentRenderer content={htmlContent} />);
    
    // Check that HTML is rendered (not escaped)
    expect(screen.getByText('This is')).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('text')).toBeInTheDocument();
  });

  it('should render HTML lists', () => {
    const htmlContent = `
      <h3>Features:</h3>
      <ul>
        <li>HTML rendering</li>
        <li>Safe sanitization</li>
        <li>Styled output</li>
      </ul>
    `;
    
    render(<ContentRenderer content={htmlContent} />);
    
    expect(screen.getByText('Features:')).toBeInTheDocument();
    expect(screen.getByText('HTML rendering')).toBeInTheDocument();
    expect(screen.getByText('Safe sanitization')).toBeInTheDocument();
    expect(screen.getByText('Styled output')).toBeInTheDocument();
  });

  it('should prefer HTML over markdown when both patterns exist', () => {
    const mixedContent = '<p>This is **HTML** with markdown chars</p>';
    
    render(<ContentRenderer content={mixedContent} />);
    
    // Should render as HTML (not process markdown)
    expect(screen.getByText('This is **HTML** with markdown chars')).toBeInTheDocument();
  });

  it('should still render markdown when no HTML is present', () => {
    const markdownContent = 'This is **bold** markdown text';
    
    render(<ContentRenderer content={markdownContent} />);
    
    // Should render markdown
    expect(screen.getByText('This is')).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('markdown text')).toBeInTheDocument();
  });

  it('should render plain text when neither HTML nor markdown is detected', () => {
    const plainContent = 'This is plain text content';
    
    render(<ContentRenderer content={plainContent} />);
    
    expect(screen.getByText('This is plain text content')).toBeInTheDocument();
  });

  it('should include title when provided', () => {
    const htmlContent = '<p>Content with title</p>';
    const title = 'Test Title';
    
    render(<ContentRenderer content={htmlContent} title={title} />);
    
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('Content with title')).toBeInTheDocument();
  });
});
