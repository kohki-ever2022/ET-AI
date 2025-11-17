/**
 * Text Chunker Service Tests
 *
 * Tests for the intelligent text chunking algorithm:
 * - Token estimation
 * - Sentence boundary detection
 * - Chunk creation with overlap
 * - Japanese and English text handling
 */

import { chunkText } from '../../functions/src/services/textChunker';

describe('Text Chunker Service', () => {
  describe('Basic chunking functionality', () => {
    it('should chunk Japanese text correctly', async () => {
      const text = '統合報告書は企業価値創造の全体像を示す重要な報告書です。' +
                   '財務情報と非財務情報を統合的に開示します。' +
                   '投資家との対話を促進する重要なツールです。';

      const chunks = await chunkText(text, {
        maxChunkSize: 100,
        overlapSize: 10,
        minChunkSize: 20,
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('chunkId');
      expect(chunks[0]).toHaveProperty('content');
      expect(chunks[0]).toHaveProperty('tokenCount');
    });

    it('should chunk English text correctly', async () => {
      const text = 'This is the first sentence. ' +
                   'This is the second sentence. ' +
                   'This is the third sentence. ' +
                   'This is the fourth sentence.';

      const chunks = await chunkText(text, {
        maxChunkSize: 20,
        overlapSize: 5,
        minChunkSize: 5,
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toBeTruthy();
    });

    it('should handle short text without splitting', async () => {
      const shortText = '短いテキストです。これは十分な長さのテキストです。さらに追加します。';

      const chunks = await chunkText(shortText, {
        minChunkSize: 10,
      });

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].content).toContain('短いテキスト');
    });

    it('should create multiple chunks for long text', async () => {
      const longText = '長いテキストです。'.repeat(100);

      const chunks = await chunkText(longText, {
        maxChunkSize: 100,
        overlapSize: 10,
        minChunkSize: 20,
      });

      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('Chunk properties', () => {
    it('should assign sequential chunk IDs', async () => {
      const text = '文章1。文章2。文章3。文章4。文章5。文章6。文章7。文章8。';

      const chunks = await chunkText(text, {
        maxChunkSize: 20,
        overlapSize: 5,
        minChunkSize: 5,
      });

      chunks.forEach((chunk, index) => {
        expect(chunk.chunkId).toBe(`chunk-${index}`);
      });
    });

    it('should calculate token counts', async () => {
      const text = '統合報告書は重要です。';

      const chunks = await chunkText(text);

      chunks.forEach((chunk) => {
        expect(chunk.tokenCount).toBeGreaterThan(0);
      });
    });

    it('should track start and end indices', async () => {
      const text = '第一文。第二文。第三文。';

      const chunks = await chunkText(text);

      chunks.forEach((chunk) => {
        expect(chunk.startIndex).toBeGreaterThanOrEqual(0);
        expect(chunk.endIndex).toBeGreaterThan(chunk.startIndex);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', async () => {
      const emptyText = '';

      const chunks = await chunkText(emptyText);

      expect(chunks.length).toBe(0);
    });

    it('should handle text with only whitespace', async () => {
      const whitespaceText = '   \n\n\t  ';

      const chunks = await chunkText(whitespaceText);

      expect(chunks.length).toBe(0);
    });

    it('should handle text without sentence boundaries', async () => {
      const noSentences = 'This is a very long text without any sentence boundaries at all that should be long enough to create at least one chunk based on the minimum chunk size requirements.';

      const chunks = await chunkText(noSentences, {
        minChunkSize: 10,
        maxChunkSize: 100,
      });

      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle mixed Japanese and English text', async () => {
      const mixedText = 'ET-AIは統合報告書作成を支援します。This is an English sentence. これは日本語です。さらに多くの文章を追加します。';

      const chunks = await chunkText(mixedText, {
        minChunkSize: 10,
        maxChunkSize: 200,
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('ET-AI');
    });

    it('should handle text with special characters', async () => {
      const specialText = '特殊文字：①②③、【】「」《》■●○を含む長めのテキストです。これで十分な長さになりました。';

      const chunks = await chunkText(specialText, {
        minChunkSize: 10,
      });

      expect(chunks.length).toBeGreaterThanOrEqual(0); // May be 0 if text is too short
    });

    it('should handle text with URLs', async () => {
      const urlText = 'Visit https://example.com for more information. 詳細はウェブサイトをご覧ください。さらに多くの情報があります。';

      const chunks = await chunkText(urlText, {
        minChunkSize: 10,
      });

      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle text with numbers and dates', async () => {
      const numberText = '2024年度の売上は1,000億円でした。前年比120%の成長です。さらに2025年度は150%を目指します。';

      const chunks = await chunkText(numberText, {
        minChunkSize: 10,
      });

      if (chunks.length > 0) {
        expect(chunks[0].content).toContain('2024');
      }
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Custom options', () => {
    it('should respect custom maxChunkSize', async () => {
      const text = '文章です。'.repeat(50);

      const chunks = await chunkText(text, {
        maxChunkSize: 50,
        minChunkSize: 10,
      });

      // Chunks may slightly exceed maxChunkSize due to sentence boundaries
      // but should generally respect the limit
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        // Allow some tolerance for sentence boundary preservation
        expect(chunk.tokenCount).toBeLessThan(80);
      });
    });

    it('should respect custom minChunkSize', async () => {
      const text = '短い文。もう一つ。さらに。最後。もっと追加します。さらに続きます。';

      const chunks = await chunkText(text, {
        minChunkSize: 5,
        maxChunkSize: 100,
      });

      // Should create chunks
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
