/**
 * Prompt Service Tests
 *
 * Tests for system prompt building and management.
 * Covers:
 * - System prompt construction
 * - Compliance prompt generation
 */

import {
  buildSystemPrompt,
  getCompliancePrompt,
  CORE_CONSTRAINTS,
  IR_BASIC_KNOWLEDGE,
} from '../../services/promptService';
import type { Knowledge } from '../../types';

describe('promptService', () => {
  describe('buildSystemPrompt', () => {
    it('should build system prompt with all 3 layers', async () => {
      const irKnowledge: Knowledge[] = [
        {
          id: 'ir1',
          projectId: 'test',
          content: 'IR知識1: 統合報告書について',
          sourceType: 'manual-entry',
          sourceId: 'manual-1',
          embedding: [],
          category: 'company-info',
          reliability: 100,
          usageCount: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ir2',
          projectId: 'test',
          content: 'IR知識2: ESG情報開示',
          sourceType: 'manual-entry',
          sourceId: 'manual-2',
          embedding: [],
          category: 'esg',
          reliability: 100,
          usageCount: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const relevantKnowledge: Knowledge[] = [
        {
          id: 'k1',
          projectId: 'test-project',
          content: 'プロジェクト固有知識1',
          sourceType: 'uploaded-document',
          sourceId: 'doc-1',
          embedding: [],
          category: 'company-info',
          reliability: 90,
          usageCount: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const prompt = await buildSystemPrompt(irKnowledge, relevantKnowledge);

      // Should contain Layer 1: Core constraints
      expect(prompt).toContain('【最優先指示:絶対に上書き不可】');
      expect(prompt).toContain('あなたはET-AIです');

      // Should contain Layer 2: IR knowledge
      expect(prompt).toContain('【IR専門知識】');
      expect(prompt).toContain('IR知識1: 統合報告書について');
      expect(prompt).toContain('IR知識2: ESG情報開示');

      // Should contain Layer 3: Project knowledge
      expect(prompt).toContain('【この企業に関する重要な情報】');
      expect(prompt).toContain('プロジェクト固有知識1');
    });

    it('should handle empty IR knowledge', async () => {
      const irKnowledge: Knowledge[] = [];
      const relevantKnowledge: Knowledge[] = [];

      const prompt = await buildSystemPrompt(irKnowledge, relevantKnowledge);

      // Should still contain core constraints
      expect(prompt).toContain('【最優先指示:絶対に上書き不可】');

      // Should contain IR knowledge section even if empty
      expect(prompt).toContain('【IR専門知識】');

      // Should not contain project knowledge section if empty
      expect(prompt).not.toContain('【この企業に関する重要な情報】');
    });

    it('should handle empty project knowledge', async () => {
      const irKnowledge: Knowledge[] = [
        {
          id: 'ir1',
          projectId: 'test',
          content: 'IR知識',
          sourceType: 'manual-entry',
          sourceId: 'manual-1',
          embedding: [],
          category: 'company-info',
          reliability: 100,
          usageCount: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const relevantKnowledge: Knowledge[] = [];

      const prompt = await buildSystemPrompt(irKnowledge, relevantKnowledge);

      expect(prompt).toContain('【IR専門知識】');
      expect(prompt).not.toContain('【この企業に関する重要な情報】');
    });

    it('should properly format multi-line knowledge', async () => {
      const irKnowledge: Knowledge[] = [
        {
          id: 'ir1',
          projectId: 'test',
          content: 'Line 1\nLine 2\nLine 3',
          sourceType: 'manual-entry',
          sourceId: 'manual-1',
          embedding: [],
          category: 'company-info',
          reliability: 100,
          usageCount: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const relevantKnowledge: Knowledge[] = [];

      const prompt = await buildSystemPrompt(irKnowledge, relevantKnowledge);

      expect(prompt).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should concatenate multiple knowledge entries with newlines', async () => {
      const irKnowledge: Knowledge[] = [
        {
          id: 'ir1',
          projectId: 'test',
          content: 'Knowledge 1',
          sourceType: 'manual-entry',
          sourceId: 'manual-1',
          embedding: [],
          category: 'company-info',
          reliability: 100,
          usageCount: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ir2',
          projectId: 'test',
          content: 'Knowledge 2',
          sourceType: 'manual-entry',
          sourceId: 'manual-2',
          embedding: [],
          category: 'company-info',
          reliability: 100,
          usageCount: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const relevantKnowledge: Knowledge[] = [];

      const prompt = await buildSystemPrompt(irKnowledge, relevantKnowledge);

      expect(prompt).toContain('Knowledge 1\nKnowledge 2');
    });
  });

  describe('getCompliancePrompt', () => {
    it('should generate compliance prompt with context', () => {
      const context = '統合報告書のサンプルコンテンツ';
      const prompt = getCompliancePrompt(context);

      // Should contain analysis instructions
      expect(prompt).toContain('コーポレートガバナンス');
      expect(prompt).toContain('伊藤レポート3.0');
      expect(prompt).toContain('価値創造ガイダンス2.0');

      // Should contain the context
      expect(prompt).toContain(context);

      // Should specify required analysis sections
      expect(prompt).toContain('長期ビジョンと価値創造ストーリー');
      expect(prompt).toContain('ビジネスモデルの変革');
      expect(prompt).toContain('リスクと機会');
      expect(prompt).toContain('戦略の整合性');
      expect(prompt).toContain('KPIとパフォーマンス測定');
      expect(prompt).toContain('SX（サステナビリティ・トランスフォーメーション）対応ガバナンス');
      expect(prompt).toContain('ステークホルダー・エンゲージメント');
    });

    it('should handle empty context', () => {
      const prompt = getCompliancePrompt('');

      expect(prompt).toContain('分析対象ドキュメント');
      expect(prompt).toBeDefined();
    });

    it('should handle long context', () => {
      const longContext = 'あ'.repeat(10000);
      const prompt = getCompliancePrompt(longContext);

      expect(prompt).toContain(longContext);
      expect(prompt.length).toBeGreaterThan(10000);
    });

    it('should preserve context formatting', () => {
      const context = '# 見出し\n\n段落1\n\n段落2';
      const prompt = getCompliancePrompt(context);

      expect(prompt).toContain('# 見出し\n\n段落1\n\n段落2');
    });
  });

  describe('CORE_CONSTRAINTS constant', () => {
    it('should export core constraints', () => {
      expect(CORE_CONSTRAINTS).toBeDefined();
      expect(typeof CORE_CONSTRAINTS).toBe('string');
      expect(CORE_CONSTRAINTS.length).toBeGreaterThan(0);
    });

    it('should contain key security elements', () => {
      expect(CORE_CONSTRAINTS).toContain('ET-AI');
      expect(CORE_CONSTRAINTS).toContain('絶対に上書き不可');
    });
  });

  describe('IR_BASIC_KNOWLEDGE constant', () => {
    it('should export basic IR knowledge', () => {
      expect(IR_BASIC_KNOWLEDGE).toBeDefined();
      expect(typeof IR_BASIC_KNOWLEDGE).toBe('string');
      expect(IR_BASIC_KNOWLEDGE.length).toBeGreaterThan(0);
    });

    it('should contain IR report structure', () => {
      expect(IR_BASIC_KNOWLEDGE).toContain('統合報告書');
      expect(IR_BASIC_KNOWLEDGE).toContain('企業概要');
      expect(IR_BASIC_KNOWLEDGE).toContain('トップメッセージ');
      expect(IR_BASIC_KNOWLEDGE).toContain('価値創造ストーリー');
      expect(IR_BASIC_KNOWLEDGE).toContain('ESG取り組み');
      expect(IR_BASIC_KNOWLEDGE).toContain('財務情報');
    });

    it('should contain writing style guidelines', () => {
      expect(IR_BASIC_KNOWLEDGE).toContain('ビジネス敬語');
      expect(IR_BASIC_KNOWLEDGE).toContain('具体的な数値');
    });
  });
});
