# 時系列構造管理UI設計

## 概要

企業（Project）→ 年度（FiscalYear）→ 期（Period）という3層時系列構造を管理するUIの設計書です。

## 1. プロジェクト設定画面の拡張

### 1.1 年度設定セクション

プロジェクト作成/編集画面に以下のフィールドを追加：

```tsx
interface ProjectSettingsForm {
  // 既存フィールド...
  companyName: string;
  industry: string;
  description: string;

  // 新規追加
  fiscalYearStartMonth: number; // 1-12
  shareholderCommunicationFrequency: 'annual' | 'semi-annual' | 'quarterly';
}
```

**UIコンポーネント例：**

```tsx
<div className="fiscal-year-settings">
  <h3>年度・期の設定</h3>

  <FormField label="年度開始月">
    <Select value={fiscalYearStartMonth} onChange={...}>
      <option value={1}>1月</option>
      <option value={2}>2月</option>
      <option value={3}>3月</option>
      <option value={4}>4月</option>
      {/* ... */}
      <option value={12}>12月</option>
    </Select>
    <HelpText>
      会計年度の開始月を選択してください。（例：4月始まりの場合は「4月」）
    </HelpText>
  </FormField>

  <FormField label="株主通信頻度">
    <RadioGroup value={shareholderCommunicationFrequency} onChange={...}>
      <Radio value="annual">年1回（通期のみ）</Radio>
      <Radio value="semi-annual">年2回（上半期・下半期）</Radio>
      <Radio value="quarterly">年4回（四半期ごと）</Radio>
    </RadioGroup>
    <HelpText>
      統合報告書や株主通信を発行する頻度を選択してください。
    </HelpText>
  </FormField>
</div>
```

## 2. 年度管理画面

### 2.1 年度一覧表示

**パス:** `/projects/{projectId}/fiscal-years`

**主要機能:**
- 年度の一覧表示（降順）
- 年度の作成
- 年度の編集
- 年度のステータス管理

**UIレイアウト例:**

```
┌─────────────────────────────────────────────────────────┐
│ 年度管理                                 [+ 新規年度作成] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 2025年度 (進行中)                         [編集] │ │
│ │ 2025-04-01 〜 2026-03-31                          │ │
│ │                                                   │ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │ │
│ │ │ 第1四半期│ │ 第2四半期│ │ 第3四半期│ │ 第4四半期│ │ │
│ │ │ 完了    │ │ 進行中  │ │ 未開始  │ │ 未開始  │ │ │
│ │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 2024年度 (完了)                           [編集] │ │
│ │ 2024-04-01 〜 2025-03-31                          │ │
│ │                                                   │ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │ │
│ │ │ 第1四半期│ │ 第2四半期│ │ 第3四半期│ │ 第4四半期│ │ │
│ │ │ 完了    │ │ 完了    │ │ 完了    │ │ 完了    │ │ │
│ │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 年度作成ダイアログ

```tsx
interface FiscalYearCreateForm {
  id: string; // 年度ID（例: "2025"）
  startDate: Date;
  endDate: Date;
  label: string; // 自動生成: "{year}年度"
  status: 'planning' | 'in-progress' | 'completed';
}
```

**バリデーション:**
- 年度の期間が重複していないか
- 開始日 < 終了日
- プロジェクトの年度開始月と整合性があるか

## 3. 期管理画面

### 3.1 期一覧表示

**パス:** `/projects/{projectId}/fiscal-years/{fiscalYearId}/periods`

**主要機能:**
- 期の一覧表示
- 期の作成（自動/手動）
- 期の編集
- 期に紐づくチャンネルの表示

**UIレイアウト例（四半期の場合）:**

```
┌─────────────────────────────────────────────────────────┐
│ 2024年度 > 期管理                     [+ 新規期作成]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 第1四半期 (Q1) - 完了                     [詳細] │ │
│ │ 2024-04-01 〜 2024-06-30                          │ │
│ │                                                   │ │
│ │ 📊 統合報告書: なし                               │ │
│ │ 📄 株主通信: 2件                                  │ │
│ │   - 第1四半期決算説明資料                         │ │
│ │   - 株主通信レター Q1                             │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 第2四半期 (Q2) - 進行中                   [詳細] │ │
│ │ 2024-07-01 〜 2024-09-30                          │ │
│ │                                                   │ │
│ │ 📊 統合報告書: なし                               │ │
│ │ 📄 株主通信: 1件                                  │ │
│ │   - 第2四半期決算説明資料                         │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 第3四半期 (Q3) - 未開始                   [詳細] │ │
│ │ 2024-10-01 〜 2024-12-31                          │ │
│ │                                                   │ │
│ │ 📊 統合報告書: なし                               │ │
│ │ 📄 株主通信: なし                                 │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 第4四半期 (Q4) - 未開始                   [詳細] │ │
│ │ 2025-01-01 〜 2025-03-31                          │ │
│ │                                                   │ │
│ │ 📊 統合報告書: なし                               │ │
│ │ 📄 株主通信: なし                                 │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 期詳細画面

**パス:** `/projects/{projectId}/fiscal-years/{fiscalYearId}/periods/{periodId}`

**主要機能:**
- 期の基本情報表示・編集
- 統合報告書チャンネルの設定
- 株主通信チャンネルの追加・削除
- 財務データの入力（オプション）

**UIレイアウト例:**

```
┌─────────────────────────────────────────────────────────┐
│ 2024年度 > 第2四半期 (Q2)                       [編集] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 基本情報                                                │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 期間: 2024-07-01 〜 2024-09-30                    │ │
│ │ ステータス: 進行中                                │ │
│ │ 種類: 四半期                                      │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ IR資料                                                  │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 統合報告書チャンネル                              │ │
│ │ [チャンネルを選択]                    [新規作成] │ │
│ │                                                   │ │
│ │ 株主通信チャンネル                    [+ 追加]   │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ 📄 第2四半期決算説明資料              [削除] │ │ │
│ │ │    チャンネルID: ch_abc123                  │ │ │
│ │ │    作成日: 2024-07-15                       │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ 財務データ（オプション）                                │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 売上高:         [          ] 百万円               │ │
│ │ 営業利益:       [          ] 百万円               │ │
│ │ 当期純利益:     [          ] 百万円               │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│                                      [キャンセル] [保存] │
└─────────────────────────────────────────────────────────┘
```

## 4. チャンネル作成時の年度・期選択

### 4.1 チャンネル作成フォームの拡張

```tsx
interface ChannelCreateForm {
  // 既存フィールド...
  name: string;
  category: ChannelCategory;
  visibility: ChannelVisibility;

  // 新規追加
  fiscalYearId: string; // 必須
  periodId?: string; // カテゴリに応じて必須
}
```

**UIコンポーネント例:**

```tsx
<FormField label="年度">
  <Select value={fiscalYearId} onChange={...} required>
    <option value="">選択してください</option>
    <option value="2025">2025年度</option>
    <option value="2024">2024年度</option>
    <option value="2023">2023年度</option>
  </Select>
</FormField>

{category === 'shareholder-letter' && (
  <FormField label="期">
    <Select value={periodId} onChange={...} required>
      <option value="">選択してください</option>
      <option value="q1">第1四半期</option>
      <option value="q2">第2四半期</option>
      <option value="q3">第3四半期</option>
      <option value="q4">第4四半期</option>
    </Select>
  </FormField>
)}
```

**バリデーション:**
- `category` が `'shareholder-letter'` の場合、`periodId` は必須
- `category` が `'integrated-report'` の場合、`periodId` は任意（通常は通期）

## 5. ナレッジ検索の時系列フィルタリング

### 5.1 検索UIの拡張

チャット画面に時系列フィルタを追加：

```tsx
<div className="knowledge-search-filters">
  <label>
    <input type="checkbox" checked={useSamePeriod} onChange={...} />
    同じ期のナレッジを優先
  </label>

  <label>
    <input type="checkbox" checked={useSameFiscalYear} onChange={...} />
    同じ年度のナレッジを優先
  </label>
</div>
```

### 5.2 検索ロジック

```typescript
/**
 * 時系列を考慮したナレッジ検索
 *
 * 優先順位:
 * 1. 同じ期のナレッジ（最も関連性が高い）
 * 2. 同じ年度の他の期のナレッジ
 * 3. 全期間のナレッジ
 */
async function searchKnowledgeWithTimeSeries(
  projectId: string,
  query: string,
  options: {
    fiscalYearId?: string;
    periodId?: string;
    limit?: number;
  }
): Promise<Knowledge[]> {
  const embedding = await generateEmbedding(query);
  const limit = options.limit || 5;
  let results: Knowledge[] = [];

  // 1. 同じ期から検索
  if (options.periodId && options.fiscalYearId) {
    results = await vectorSearch(projectId, embedding, {
      fiscalYearId: options.fiscalYearId,
      periodId: options.periodId,
      limit,
    });
  }

  // 2. 同じ年度から追加検索
  if (results.length < limit && options.fiscalYearId) {
    const additionalResults = await vectorSearch(projectId, embedding, {
      fiscalYearId: options.fiscalYearId,
      limit: limit - results.length,
      excludeIds: results.map(r => r.id), // 既に取得したものを除外
    });
    results = [...results, ...additionalResults];
  }

  // 3. 全期間から追加検索
  if (results.length < limit) {
    const additionalResults = await vectorSearch(projectId, embedding, {
      limit: limit - results.length,
      excludeIds: results.map(r => r.id),
    });
    results = [...results, ...additionalResults];
  }

  return results;
}
```

## 6. 管理画面のナビゲーション構造

```
プロジェクト一覧
  └── プロジェクト詳細
      ├── ダッシュボード
      ├── チャンネル一覧
      ├── ナレッジベース
      ├── ドキュメント
      ├── 年度管理 ★新規★
      │   ├── 年度一覧
      │   └── 年度詳細
      │       └── 期管理
      │           ├── 期一覧
      │           └── 期詳細
      └── 設定
          ├── 基本設定
          ├── メンバー管理
          └── 年度・期設定 ★新規★
```

## 7. 実装の優先順位

### フェーズ1: データモデルとバックエンド（最優先）
- [x] Firestore スキーマ定義の更新
- [x] マイグレーションスクリプトの作成
- [x] Firestore インデックスの設定
- [ ] ナレッジ検索ロジックの時系列対応

### フェーズ2: 基本UI（中優先）
- [ ] プロジェクト設定画面の拡張
- [ ] 年度一覧画面の実装
- [ ] 期一覧画面の実装
- [ ] チャンネル作成時の年度・期選択

### フェーズ3: 高度なUI（低優先）
- [ ] 期詳細画面の実装
- [ ] 財務データ入力機能
- [ ] 時系列フィルタ付きナレッジ検索UI
- [ ] ダッシュボードでの年度・期の可視化

## 8. デザインガイドライン

### 8.1 カラーコード

- **年度（FiscalYear）**: 青系（`#3B82F6`）
- **期（Period）**: 緑系（`#10B981`）
- **統合報告書**: 紫系（`#8B5CF6`）
- **株主通信**: オレンジ系（`#F59E0B`）

### 8.2 ステータスバッジ

```tsx
// FiscalYear Status
<Badge color="gray">planning</Badge>
<Badge color="blue">in-progress</Badge>
<Badge color="green">completed</Badge>

// Period Status
<Badge color="gray">not-started</Badge>
<Badge color="blue">in-progress</Badge>
<Badge color="green">completed</Badge>
<Badge color="orange">archived</Badge>
```

### 8.3 アイコン

- 年度: 📅 (`:calendar:`)
- 期: 📊 (`:bar_chart:`)
- 統合報告書: 📘 (`:blue_book:`)
- 株主通信: 📄 (`:page_facing_up:`)

## 9. テストケース

### 9.1 年度作成テスト
- [ ] 正常に年度を作成できる
- [ ] 年度の期間が重複している場合にエラーが表示される
- [ ] 年度開始月とプロジェクト設定が整合している

### 9.2 期作成テスト
- [ ] 四半期の期が正しく作成される
- [ ] 半期の期が正しく作成される
- [ ] 年次の期が正しく作成される
- [ ] 期の日付が年度の範囲内である

### 9.3 チャンネル作成テスト
- [ ] 年度を指定してチャンネルを作成できる
- [ ] 株主通信チャンネルには期の指定が必須
- [ ] 統合報告書チャンネルには期の指定が任意

### 9.4 ナレッジ検索テスト
- [ ] 同じ期のナレッジが優先的に取得される
- [ ] 同じ年度の他の期のナレッジが次に取得される
- [ ] 全期間のナレッジが最後に取得される

## 10. 今後の拡張案

### 10.1 財務データの可視化
- 年度・期ごとの財務指標のグラフ表示
- 前年同期比の自動計算と表示
- 業界平均との比較

### 10.2 自動期作成
- 年度作成時に期を自動生成するオプション
- 株主通信頻度の変更時に期を再生成

### 10.3 アーカイブ機能
- 過去の年度・期のアーカイブ
- アーカイブされた年度・期の検索除外オプション

### 10.4 通知機能
- 期の終了が近づいたときの通知
- 株主通信の発行期限のリマインダー

---

## 参考資料

- [Firestore スキーマ定義](./types/firestore.ts)
- [マイグレーションスクリプト](./scripts/migrateToTimeSeries.ts)
- [Firestore インデックス](./firestore.indexes.json)
