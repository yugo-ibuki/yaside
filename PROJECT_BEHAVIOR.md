# yaside プロジェクト挙動解説

## 概要

`yaside` は、YAMLファイルで定義されたワークフローを順次実行するTypeScript製のワークフローエグゼキューターです。
AI開発ツール（Claude、Codexなど）を含む各種CLIコマンドを組み合わせて、複雑な開発タスクを自動化できます。

## アーキテクチャ

### 主要コンポーネント

```
src/
├── workflow/
│   ├── types.ts      # 型定義（WorkflowConfig, WorkflowStep, etc.）
│   ├── parser.ts     # YAMLパーサー
│   └── executor.ts   # ワークフロー実行エンジン
└── index.ts          # エントリーポイント
```

### データフロー

```
YAMLファイル → Parser → WorkflowConfig → Executor → コマンド実行
```

## 処理フロー詳細

### 1. 初期化フェーズ

**ファイル**: `src/index.ts`

```typescript
const config = parseWorkflowYaml(workflowFile);
const executor = new WorkflowExecutor(config);
await executor.execute();
```

1. コマンドライン引数からYAMLファイルパスを取得
2. YAMLファイルをパース（`parser.ts`）
3. WorkflowExecutorインスタンスを生成
4. ワークフロー実行を開始

### 2. パースフェーズ

**ファイル**: `src/workflow/parser.ts`

```typescript
export function parseWorkflowYaml(filePath: string): WorkflowConfig
```

- YAMLファイルを読み込み
- YAML.parseでJavaScriptオブジェクトに変換
- `workflows.steps` の存在をバリデーション
- WorkflowConfig型として返却

### 3. 実行計画構築フェーズ

**ファイル**: `src/workflow/executor.ts` - `buildExecutionPlan()`

この段階が最も重要な処理です。YAMLで定義されたステップを、グループとリピート設定を考慮して実行可能な順序に展開します。

#### アルゴリズム

```typescript
private buildExecutionPlan(): ExecutableStep[]
```

1. **ステップの分類**
   - 各ステップをグループ有り/無しで分類
   - グループ設定（attempt回数）を取得

2. **実行順序の構築**
   - YAMLの定義順を維持しながら処理
   - グループが連続している場合はバッファに蓄積
   - グループが変わる、またはグループなしステップが来たら、バッファをフラッシュ

3. **グループのリピート展開**
   ```typescript
   // グループ "review-code" を3回実行する場合
   // review (attempt 1) → fix (attempt 1)
   // review (attempt 2) → fix (attempt 2)
   // review (attempt 3) → fix (attempt 3)
   ```

#### 具体例

**YAML定義**:
```yaml
workflows:
  steps:
    code:        # グループなし
      name: "code"
      command: claude

    review:      # グループ: review-code
      name: "review"
      command: codex
      group: review-code

    fix:         # グループ: review-code
      name: "fix"
      command: claude
      group: review-code

settings:
  groupName: review-code
  attempt: 3
```

**実行計画展開結果**:
```
1. code (グループなし、1回のみ実行)
2. review (attempt 1)
3. fix (attempt 1)
4. review (attempt 2)
5. fix (attempt 2)
6. review (attempt 3)
7. fix (attempt 3)
```

### 4. ステップ実行フェーズ

**ファイル**: `src/workflow/executor.ts` - `executeStep()`

各ステップを順次実行します。

#### コマンド構築

```typescript
private buildCommandArgs(step: WorkflowStep): string
```

1. **prompt**: コマンドの第一引数として渡される
   ```bash
   claude "コードを書いてください"
   ```

2. **reference**: `--reference` オプションとして渡される
   ```bash
   claude "コードを書いてください" --reference "./.claude/spec/XXX.md"
   ```

#### 実行方法

```typescript
execSync(fullCommand, {
  stdio: 'inherit',    // 標準入出力を継承（コマンドの出力が直接表示される）
  shell: '/bin/bash'   // bashシェルで実行
});
```

- `execSync`: 同期的にコマンドを実行（完了まで待機）
- `stdio: 'inherit'`: コマンドの標準出力/エラーをそのまま表示
- エラー時は例外をスローしてワークフロー全体を停止

## YAML設定詳細

### ステップ定義

```yaml
step-key:
  name: string          # ステップ名（表示用）
  command: string       # 実行するCLIコマンド
  prompt: string        # コマンドに渡すプロンプト（必須）
  reference?: string    # 参照ファイルパス（オプション）
  group?: string        # グループ名（オプション）
```

### settings設定

#### 単一グループ設定（後方互換性）

```yaml
settings:
  groupName: string   # 対象グループ名
  attempt: number     # 繰り返し回数
```

#### 複数グループ設定

```yaml
settings:
  groups:
    - groupName: string
      attempt: number
    - groupName: string
      attempt: number
```

## グループ機能の詳細

### 目的

関連するステップ（例: レビュー→修正）をセットとして繰り返し実行することで、品質を段階的に改善します。

### 動作原理

1. **グループ識別**: 同じ `group` 値を持つステップは同一グループ
2. **連続性の保持**: YAMLで連続して定義されたグループステップは一つのグループとして扱われる
3. **リピート展開**: `settings.attempt` で指定された回数だけ、グループ内の全ステップを繰り返す
4. **順序保証**: グループ内のステップの順序は維持される

### ユースケース

#### レビュー＆フィックスサイクル
```yaml
review:
  group: review-code
fix:
  group: review-code

settings:
  groupName: review-code
  attempt: 3
```

実行結果: レビュー→修正を3回繰り返すことで、コード品質を段階的に向上

#### テスト＆検証サイクル
```yaml
test:
  group: test-verify
verify:
  group: test-verify

settings:
  groups:
    - groupName: test-verify
      attempt: 2
```

実行結果: テスト→検証を2回繰り返して確実性を高める

## コマンド実行の仕組み

### サポートされるコマンド

yasideは任意のCLIコマンドを実行できます：

- **AIツール**: `claude`, `codex`（実際のCLIツールが必要）
- **標準コマンド**: `echo`, `npm`, `git`, etc.
- **カスタムスクリプト**: プロジェクト固有のシェルスクリプト

### 引数の渡し方

```typescript
// 基本形
${command} "${prompt}"

// referenceがある場合
${command} "${prompt}" --reference "${reference}"
```

### エラーハンドリング

- コマンドが失敗（非ゼロ終了コード）した場合、`execSync`が例外をスロー
- ワークフロー全体が停止
- エラーメッセージが表示される

## 使用例

### シンプルなワークフロー

```bash
npm run dev example-workflow.yml
```

**実行内容**:
1. コード実装（1回）
2. レビュー＆フィックス（3回繰り返し）

### 高度なワークフロー

```bash
npm run dev example-workflow-advanced.yml
```

**実行内容**:
1. 初期化（1回）
2. コード実装（1回）
3. レビュー＆フィックス（3回繰り返し）
4. テスト＆検証（2回繰り返し）
5. デプロイ（1回）

## まとめ

### 特徴

1. **YAMLベース**: 宣言的な設定でワークフローを定義
2. **グループリピート機能**: 関連ステップをセットで繰り返し実行
3. **柔軟なコマンド実行**: 任意のCLIツールを統合可能
4. **順序保証**: YAML定義順を厳密に維持
5. **エラーハンドリング**: 失敗時は即座に停止

### 典型的なユースケース

- AIアシスタントを使った反復的なコード改善
- 自動テスト＆修正サイクル
- マルチステージのCI/CDパイプライン
- コードレビュー＆リファクタリングの自動化
