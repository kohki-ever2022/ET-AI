/**
 * DOCX Text Extraction Service
 *
 * Extracts text content from DOCX files using mammoth library.
 * Preserves document structure and formatting.
 */

import mammoth from 'mammoth';
import type { TextExtractionResult } from '../types';

/**
 * Extracts text from a DOCX file in Firebase Storage
 *
 * @param file - Firebase Storage file reference
 * @returns Extracted text and metadata
 */
export async function extractTextFromDOCX(file: any): Promise<string> {
  try {
    console.log(`Extracting text from DOCX: ${file.name}`);

    // Download file buffer
    const [buffer] = await file.download();

    // Extract text using mammoth
    const result = await mammoth.extractRawText({
      buffer: buffer,
    });

    // Get extracted text
    const extractedText = result.value;

    // Log any warnings
    if (result.messages.length > 0) {
      console.warn('DOCX extraction warnings:', result.messages);
    }

    // Get metadata
    const metadata: TextExtractionResult['metadata'] = {
      wordCount: countWords(extractedText),
      characterCount: extractedText.length,
    };

    console.log(`DOCX extraction successful:`, {
      words: metadata.wordCount,
      characters: metadata.characterCount,
      warnings: result.messages.length,
    });

    // Clean and normalize text
    const cleanedText = cleanText(extractedText);

    return cleanedText;
  } catch (error) {
    console.error('DOCX extraction failed:', error);

    if (error instanceof Error) {
      throw new Error(`DOCXテキスト抽出エラー: ${error.message}`);
    }

    throw new Error('DOCXテキスト抽出に失敗しました。');
  }
}

/**
 * Extracts text with HTML formatting preserved
 *
 * Useful for preserving document structure like headings, lists, etc.
 */
export async function extractTextFromDOCXWithFormatting(
  file: any
): Promise<{ text: string; html: string }> {
  try {
    const [buffer] = await file.download();

    // Extract with HTML conversion
    const htmlResult = await mammoth.convertToHtml({
      buffer: buffer,
    });

    // Extract raw text
    const textResult = await mammoth.extractRawText({
      buffer: buffer,
    });

    return {
      text: cleanText(textResult.value),
      html: htmlResult.value,
    };
  } catch (error) {
    console.error('DOCX extraction with formatting failed:', error);
    throw new Error('DOCXテキスト抽出（書式付き）に失敗しました。');
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
 * Validates DOCX file structure
 */
export function isValidDOCX(buffer: Buffer): boolean {
  // Check DOCX signature (PK zip header)
  // DOCX files are ZIP archives
  const signature = buffer.toString('hex', 0, 4);
  return signature === '504b0304'; // PK.. in hex
}

/**
 * Extracts metadata from DOCX
 */
export async function extractDOCXMetadata(
  file: any
): Promise<{
  wordCount: number;
  characterCount: number;
  hasImages: boolean;
  hasTables: boolean;
}> {
  try {
    const [buffer] = await file.download();

    // Extract with full conversion to check for images and tables
    const htmlResult = await mammoth.convertToHtml({
      buffer: buffer,
    });

    const textResult = await mammoth.extractRawText({
      buffer: buffer,
    });

    // Check for images and tables in HTML
    const hasImages = htmlResult.value.includes('<img');
    const hasTables = htmlResult.value.includes('<table');

    return {
      wordCount: countWords(textResult.value),
      characterCount: textResult.value.length,
      hasImages,
      hasTables,
    };
  } catch (error) {
    console.error('DOCX metadata extraction failed:', error);
    throw new Error('DOCXメタデータの抽出に失敗しました。');
  }
}
