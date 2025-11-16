/**
 * PDF Text Extraction Service
 *
 * Extracts text content from PDF files using pdf-parse library.
 * Handles multi-page PDFs and preserves text structure.
 */

import type { TextExtractionResult } from '../types';

// Import pdf-parse with proper typing
const pdfParse = require('pdf-parse');

/**
 * Extracts text from a PDF file in Firebase Storage
 *
 * @param file - Firebase Storage file reference
 * @returns Extracted text and metadata
 */
export async function extractTextFromPDF(file: any): Promise<string> {
  try {
    console.log(`Extracting text from PDF: ${file.name}`);

    // Download file buffer
    const [buffer] = await file.download();

    // Parse PDF
    const data = await pdfParse(buffer, {
      // PDF parsing options
      max: 0, // Parse all pages (0 = no limit)
    });

    // Extract text content
    const extractedText = data.text;

    // Get metadata
    const metadata: TextExtractionResult['metadata'] = {
      pageCount: data.numpages,
      wordCount: countWords(extractedText),
      characterCount: extractedText.length,
    };

    console.log(`PDF extraction successful:`, {
      pages: metadata.pageCount,
      words: metadata.wordCount,
      characters: metadata.characterCount,
    });

    // Clean and normalize text
    const cleanedText = cleanText(extractedText);

    return cleanedText;
  } catch (error) {
    console.error('PDF extraction failed:', error);

    if (error instanceof Error) {
      throw new Error(`PDFテキスト抽出エラー: ${error.message}`);
    }

    throw new Error('PDFテキスト抽出に失敗しました。');
  }
}

/**
 * Cleans and normalizes extracted text
 */
function cleanText(text: string): string {
  return (
    text
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')

      // Remove excessive whitespace
      .replace(/[ \t]+/g, ' ')

      // Remove excessive line breaks (keep max 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')

      // Trim each line
      .split('\n')
      .map((line) => line.trim())
      .join('\n')

      // Trim overall
      .trim()
  );
}

/**
 * Counts words in text
 */
function countWords(text: string): number {
  // Split by whitespace and filter out empty strings
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

/**
 * Validates PDF file structure
 */
export function isValidPDF(buffer: Buffer): boolean {
  // Check PDF signature (magic bytes)
  const signature = buffer.toString('ascii', 0, 4);
  return signature === '%PDF';
}

/**
 * Extracts metadata from PDF without full text extraction
 */
export async function extractPDFMetadata(
  file: any
): Promise<{
  pageCount: number;
  title?: string;
  author?: string;
  creationDate?: Date;
}> {
  try {
    const [buffer] = await file.download();
    const data = await pdfParse(buffer);

    return {
      pageCount: data.numpages,
      title: data.info?.Title,
      author: data.info?.Author,
      creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
    };
  } catch (error) {
    console.error('PDF metadata extraction failed:', error);
    throw new Error('PDFメタデータの抽出に失敗しました。');
  }
}
