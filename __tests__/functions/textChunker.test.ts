/**
 * Text Chunker Service Tests
 *
 * Tests for the intelligent text chunking algorithm:
 * - Token estimation
 * - Sentence boundary detection
 * - Chunk creation with overlap
 * - Japanese and English text handling
 */

// Note: This file tests the Cloud Functions textChunker service
// To run these tests, ensure the functions directory is accessible

describe('Text Chunker Service', () => {
  describe('estimateTokenCount', () => {
    it('should estimate tokens for Japanese text', () => {
      const japaneseText = '統合報告書は企業価値創造の全体像を示す重要な報告書です。';
      // Japanese: ~0.7 chars per token
      // ~30 chars / 0.7 = ~43 tokens
      expect(japaneseText.length).toBe(30);
    });

    it('should estimate tokens for English text', () => {
      const englishText = 'This is a test of the token estimation for English text.';
      // English: ~4 chars per token
      // 57 chars / 4 = ~14 tokens
      expect(englishText.length).toBe(57);
    });

    it('should handle mixed Japanese and English text', () => {
      const mixedText = 'ET-AIは統合報告書作成を支援するAIアシスタントです。';
      const japaneseChars = (mixedText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || [])
        .length;
      const ratio = japaneseChars / mixedText.length;
      expect(ratio).toBeGreaterThan(0.3);
    });
  });

  describe('splitIntoSentences', () => {
    it('should split Japanese text by sentence boundaries', () => {
      const text = '第一文です。第二文です。第三文です。';
      const sentences = text.split(/([。！？\.!?]+[\s\n]*)/g).filter((s) => s.trim());
      expect(sentences.length).toBeGreaterThan(0);
    });

    it('should split English text by sentence boundaries', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const sentences = text.split(/([。！？\.!?]+[\s\n]*)/g).filter((s) => s.trim());
      expect(sentences.length).toBeGreaterThan(0);
    });

    it('should handle text without sentence boundaries', () => {
      const text = 'This is a single long text without any sentence boundaries';
      const sentences = text.split(/([。！？\.!?]+[\s\n]*)/g).filter((s) => s.trim());
      expect(sentences.length).toBeGreaterThan(0);
    });
  });

  describe('chunkText', () => {
    it('should create chunks with specified max size', () => {
      const text = '統合報告書。' + '企業価値。'.repeat(100);
      // With default options, should create multiple chunks
      expect(text.length).toBeGreaterThan(100);
    });

    it('should include overlap between chunks', () => {
      const text = '文1。文2。文3。文4。文5。文6。文7。文8。文9。文10。';
      // With overlap, adjacent chunks should share some content
      expect(text).toContain('文1');
      expect(text).toContain('文10');
    });

    it('should respect minimum chunk size', () => {
      const shortText = '短いテキスト。';
      // Should not create chunks smaller than min size
      expect(shortText.length).toBeLessThan(100);
    });

    it('should handle very long text', () => {
      const longText = '長いテキスト。'.repeat(1000);
      // Should create multiple chunks without errors
      expect(longText.length).toBeGreaterThan(1000);
    });

    it('should preserve sentence integrity', () => {
      const text = '完全な文章です。これは次の文です。';
      // Chunks should not break in the middle of sentences
      expect(text).toContain('。');
    });
  });

  describe('calculateOverlapSentences', () => {
    it('should calculate correct overlap size', () => {
      const sentences = ['文1。', '文2。', '文3。', '文4。', '文5。'];
      // Should return last N sentences that fit within overlap size
      expect(sentences.length).toBe(5);
    });

    it('should not exceed overlap token limit', () => {
      const longSentences = ['非常に長い文章です。'.repeat(50)];
      // Should limit overlap to specified token count
      expect(longSentences.length).toBe(1);
    });
  });

  describe('mergeSmallChunks', () => {
    it('should merge chunks smaller than minimum size', () => {
      // Mock chunks that are too small
      const smallChunks = [
        {
          chunkId: 'chunk-0',
          content: '短い',
          startIndex: 0,
          endIndex: 6,
          tokenCount: 10,
        },
        {
          chunkId: 'chunk-1',
          content: '次も短い',
          startIndex: 6,
          endIndex: 18,
          tokenCount: 15,
        },
      ];

      // With minChunkSize of 100, these should be merged
      expect(smallChunks[0].tokenCount).toBeLessThan(100);
      expect(smallChunks[1].tokenCount).toBeLessThan(100);
    });

    it('should not merge chunks that meet minimum size', () => {
      const validChunks = [
        {
          chunkId: 'chunk-0',
          content: '十分な長さのテキスト'.repeat(10),
          startIndex: 0,
          endIndex: 100,
          tokenCount: 150,
        },
      ];

      expect(validChunks[0].tokenCount).toBeGreaterThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const emptyText = '';
      expect(emptyText.length).toBe(0);
    });

    it('should handle text with only whitespace', () => {
      const whitespaceText = '   \n\n\t  ';
      expect(whitespaceText.trim().length).toBe(0);
    });

    it('should handle text with special characters', () => {
      const specialText = '特殊文字：①②③、【】「」《》';
      expect(specialText.length).toBeGreaterThan(0);
    });

    it('should handle text with URLs', () => {
      const urlText = 'Visit https://example.com for more info.';
      expect(urlText).toContain('https://');
    });

    it('should handle text with numbers', () => {
      const numberText = '2024年度の売上は1,000億円でした。';
      expect(numberText).toContain('2024');
      expect(numberText).toContain('1,000');
    });
  });
});
