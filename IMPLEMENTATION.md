# ai-workflow 実装ドキュメント

## プロジェクト概要

`ai-workflow` は、AI エージェント（Claude、OpenAI など）を使った開発ワークフローを YAML で定義し、自動実行できる CLI ツールです。

### 主な特徴

- **宣言的なワークフロー定義**: YAML で直感的にワークフローを記述
- **複数 AI エージェント対応**: Claude をサポート（OpenAI は将来実装予定）
- **柔軟なコンテキスト管理**: ファイル、コマンド結果、前ステップの出力を参照
- **型安全**: TypeScript で実装され、完全な型チェック
- **拡張性**: エージェントやコマンドを簡単に追加可能

## アーキテクチャ

### ディレクトリ構成

```
yaside/
├── src/
│   ├── agents/             # AI エージェント関連
│   │   ├── base-agent.ts       # エージェントの抽象基底クラス
│   │   ├── claude-agent.ts     # Claude 実装
│   │   ├── agent-factory.ts    # エージェントファクトリー
│   │   └── index.ts
│   ├── commands/           # CLI コマンド
│   │   ├── init.ts            # 初期化コマンド
│   │   ├── run.ts             # 実行コマンド
│   │   ├── list.ts            # 一覧コマンド
│   │   ├── logs.ts            # ログコマンド
│   │   └── index.ts
│   ├── config/             # 設定管理
│   │   ├── config-manager.ts  # グローバル設定管理
│   │   └── index.ts
│   ├── context/            # コンテキスト構築
│   │   ├── context-builder.ts # ファイル・コマンド結果を収集
│   │   └── index.ts
│   ├── executor/           # ワークフロー実行
│   │   ├── workflow-executor.ts # 実行エンジン
│   │   └── index.ts
│   ├── parser/             # YAML パーサー
│   │   ├── schema.ts          # Zod スキーマ定義
│   │   ├── workflow-parser.ts # YAML パーサー実装
│   │   └── index.ts
│   ├── types/              # 型定義
│   │   ├── workflow.ts        # ワークフロー関連の型
│   │   └── index.ts
│   ├── utils/              # ユーティリティ
│   │   ├── file-utils.ts      # ファイル操作
│   │   ├── command-utils.ts   # コマンド実行
│   │   ├── template-utils.ts  # テンプレート変数置換
│   │   └── index.ts
│   ├── cli.ts              # CLI エントリーポイント
│   └── index.ts            # ライブラリエントリーポイント
├── examples/               # サンプルワークフロー
│   ├── simple-workflow.yml
│   ├── code-review-workflow.yml
│   └── tdd-workflow.yml
├── dist/                   # ビルド出力
├── package.json
├── tsconfig.json
├── .gitignore
├── .prettierrc
├── .env.example
└── README.md
```

### コンポーネント詳細

#### 1. Types (`src/types/`)

ワークフロー定義と実行時の型を定義。

**主要な型:**

```typescript
// ワークフロー定義
interface Workflow {
  name: string;
  description?: string;
  steps: Step[];
}

// ステップ定義
interface Step {
  name: string;
  type: 'agent' | 'command' | 'human_approval';
  agent?: AgentConfig;
  command?: string;
  context?: ContextConfig;
  prompt?: string;
  on_failure?: FailureAction | string;
}

// 実行結果
interface StepResult {
  stepName: string;
  stepIndex: number;
  output: string;
  success: boolean;
  error?: Error;
  duration: number;
}
```

#### 2. Parser (`src/parser/`)

YAML ファイルを読み込んでワークフロー定義に変換。Zod でスキーマ検証を行う。

**主な機能:**
- YAML ファイルの読み込み
- スキーマバリデーション
- ワークフロー名による取得
- ワークフロー一覧の取得

**使用例:**
```typescript
const parser = new WorkflowParser();
const workflow = await parser.getWorkflow('./workflow.yml', 'example');
```

#### 3. Config (`src/config/`)

グローバル設定を管理。`~/.ai-workflow/config.yml` に保存。

**設定項目:**
- デフォルトエージェント
- API キー（環境変数での置換サポート）
- ログレベル
- ログディレクトリ

**使用例:**
```typescript
const configManager = ConfigManager.getInstance();
const apiKey = await configManager.getApiKey('anthropic');
```

#### 4. Context Builder (`src/context/`)

ステップ実行時のコンテキストを構築。

**収集するコンテキスト:**
- ファイルコンテンツ（glob パターン対応）
- コマンド実行結果
- カスタム変数

**使用例:**
```typescript
const builder = new ContextBuilder();
const context = await builder.build(contextConfig, executionContext);
```

#### 5. Agents (`src/agents/`)

AI エージェントの抽象化と実装。

**設計パターン:**
- `BaseAgent`: 抽象基底クラス
- `ClaudeAgent`: Claude 実装
- `AgentFactory`: エージェント生成ファクトリー

**使用例:**
```typescript
const agent = await AgentFactory.create({ type: 'claude' });
const response = await agent.generate({
  prompt: 'コードをレビューしてください',
  context: fileContents
});
```

#### 6. Executor (`src/executor/`)

ワークフロー全体の実行を管理。

**機能:**
- ステップの順次実行
- エラーハンドリング
- コールバック（onStepStart, onStepComplete, onError など）
- 失敗時のリトライ・継続・停止

**使用例:**
```typescript
const executor = new WorkflowExecutor(workflow, {
  onStepStart: (step) => console.log(`Starting: ${step.name}`),
  onStepComplete: (step, result) => console.log(result.output)
});

const results = await executor.run('ユーザー入力');
```

#### 7. Commands (`src/commands/`)

CLI コマンドの実装。

**コマンド:**
- `init`: プロジェクト初期化
- `run`: ワークフロー実行
- `list`: ワークフロー一覧表示
- `logs`: ログ表示

#### 8. Utils (`src/utils/`)

ユーティリティ関数群。

**主な機能:**
- ファイル検索・読み込み（glob パターン）
- コマンド実行
- テンプレート変数置換

## 実装詳細

### 変数置換メカニズム

ワークフロー内で以下の変数が使用可能:

| 変数 | 説明 | 例 |
|------|------|-----|
| `{{input}}` | ユーザー入力 | `"{{input}}を実装してください"` |
| `$previous_output` | 直前ステップの出力 | `"$previous_output"` |
| `$step[N].output` | N番目のステップ出力 | `"$step[0].output"` |
| `$step[name].output` | 名前指定のステップ出力 | `"$step[実装].output"` |

**実装:** `src/utils/template-utils.ts` の `replaceVariables()` 関数

### エラーハンドリング

ステップ失敗時の動作を `on_failure` で指定可能:

**文字列形式:**
```yaml
on_failure: "continue"  # 次のステップに進む
on_failure: "stop"      # ワークフローを停止
on_failure: "retry_step[2]"  # 特定ステップをリトライ
```

**オブジェクト形式:**
```yaml
on_failure:
  action: retry
  max_retries: 3
```

### コンテキスト構築

ステップ実行前に必要なコンテキストを自動収集:

1. **ファイル収集**: glob パターンでファイルを検索
2. **コマンド実行**: 指定されたコマンドを実行して結果を取得
3. **変数置換**: コンテキスト内の変数を実行時の値で置換
4. **フォーマット**: AI が理解しやすい形式に整形

## 使用方法

### インストール

```bash
# 依存関係のインストール
pnpm install

# ビルド
pnpm build

# グローバルにインストール（オプション）
pnpm link --global
```

### 基本的な使い方

#### 1. 初期化

```bash
ai-workflow init
```

これにより以下が作成される:
- `~/.ai-workflow/config.yml` - グローバル設定
- `workflow.yml` - プロジェクトローカルのワークフロー定義
- `.env.example` - 環境変数のサンプル

#### 2. API キーの設定

```bash
# 環境変数で設定
export ANTHROPIC_API_KEY="your-api-key"

# または config.yml に記載
vi ~/.ai-workflow/config.yml
```

#### 3. ワークフロー実行

```bash
# 基本的な実行
ai-workflow run example "ユーザー認証機能"

# dry-run（実行せずプレビュー）
ai-workflow run --dry-run example "テスト"

# カスタムファイルを指定
ai-workflow run -f ./custom-workflow.yml workflow-name "input"
```

#### 4. その他のコマンド

```bash
# ワークフロー一覧
ai-workflow list

# ログ表示
ai-workflow logs --last
```

### ワークフロー定義例

#### シンプルな例

```yaml
workflows:
  hello-world:
    description: "Hello Worldワークフロー"
    steps:
      - name: "挨拶を生成"
        type: agent
        agent:
          type: claude
        prompt: "{{input}}に対して親しみやすい挨拶を生成してください"
```

#### 複雑な例（コードレビュー）

```yaml
workflows:
  code-review:
    description: "包括的なコードレビュー"
    steps:
      - name: "セキュリティチェック"
        type: agent
        agent:
          type: claude
        context:
          files:
            - "src/**/*.ts"
        prompt: "セキュリティ脆弱性をチェックしてください"

      - name: "パフォーマンス分析"
        type: agent
        agent:
          type: claude
        context:
          files:
            - "src/**/*.ts"
        prompt: "パフォーマンスの問題を分析してください"

      - name: "レポート生成"
        type: agent
        agent:
          type: claude
        context:
          files:
            - "$step[0].output"
            - "$step[1].output"
        prompt: "レビュー結果をMarkdownでまとめてください"
```

### プログラマティックな使用

VSCode 拡張や他のツールから使う場合:

```typescript
import { WorkflowExecutor, WorkflowParser } from 'ai-workflow';

// ワークフロー読み込み
const parser = new WorkflowParser();
const workflow = await parser.getWorkflow('./workflow.yml', 'example');

// 実行
const executor = new WorkflowExecutor(workflow, {
  onStepStart: (step) => {
    console.log(`Starting: ${step.name}`);
  },
  onStepComplete: (step, result) => {
    console.log(`Completed: ${step.name}`);
    console.log(result.output);
  },
  onError: (step, error) => {
    console.error(`Error in ${step.name}:`, error);
  }
});

const result = await executor.run('ユーザー入力');
console.log(result);
```

## テクニカルスタック

### 言語・フレームワーク

- **TypeScript 5.7+**: 型安全な実装
- **Node.js 18+**: 実行環境

### 主要な依存関係

#### 本番依存関係

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `@anthropic-ai/sdk` | ^0.32.1 | Claude API クライアント |
| `commander` | ^12.1.0 | CLI フレームワーク |
| `yaml` | ^2.6.1 | YAML パーサー |
| `chalk` | ^5.3.0 | ターミナル色付け |
| `ora` | ^8.1.1 | スピナー表示 |
| `glob` | ^11.0.0 | ファイル検索 |
| `dotenv` | ^16.4.7 | 環境変数読み込み |
| `zod` | ^3.24.1 | スキーマバリデーション |

#### 開発依存関係

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `typescript` | ^5.7.2 | TypeScript コンパイラ |
| `tsx` | ^4.19.2 | TypeScript 実行環境 |
| `vitest` | ^2.1.8 | テストフレームワーク |
| `eslint` | ^9.17.0 | Linter |
| `prettier` | ^3.4.2 | コードフォーマッター |
| `@typescript-eslint/*` | ^8.18.2 | ESLint TypeScript サポート |

### TypeScript 設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## 開発ガイド

### ビルド

```bash
# TypeScript をコンパイル
pnpm build

# 開発モード（ファイル監視）
pnpm dev
```

### テスト

```bash
# テスト実行
pnpm test
```

### コード品質

```bash
# Lint
pnpm lint

# フォーマット
pnpm format
```

### 新しいエージェントの追加

1. `src/agents/` に新しいエージェントクラスを作成
2. `BaseAgent` を継承
3. `generate()` メソッドを実装
4. `AgentFactory` に登録
5. 型定義（`AgentType`）に追加

**例:**

```typescript
// src/agents/openai-agent.ts
import { BaseAgent, type AgentRequest, type AgentResponse } from './base-agent.js';

export class OpenAIAgent extends BaseAgent {
  async generate(request: AgentRequest): Promise<AgentResponse> {
    // OpenAI API 実装
  }

  protected getDefaultModel(): string {
    return 'gpt-4';
  }
}

// src/agents/agent-factory.ts に追加
case 'openai':
  return await OpenAIAgent.create(config);
```

### 新しいコマンドの追加

1. `src/commands/` に新しいコマンドファイルを作成
2. `src/cli.ts` にコマンド登録

**例:**

```typescript
// src/commands/validate.ts
export async function validateCommand(file?: string): Promise<void> {
  // バリデーション実装
}

// src/cli.ts に追加
program
  .command('validate')
  .description('ワークフローをバリデート')
  .option('-f, --file <path>', 'ワークフローファイルのパス')
  .action(validateCommand);
```

## トラブルシューティング

### ビルドエラー

**問題**: `Cannot find namespace 'ora'`

**解決策**:
```typescript
import ora, { type Ora } from 'ora';
```

**問題**: `'executionContext' is declared but its value is never read`

**解決策**: 未使用の引数に `_` プレフィックスを付ける
```typescript
private async executeHumanApprovalStep(
  step: Step,
  _executionContext: WorkflowExecutionContext
): Promise<string>
```

### 実行時エラー

**問題**: `ANTHROPIC_API_KEY is not set`

**解決策**:
```bash
export ANTHROPIC_API_KEY="your-api-key"
```

**問題**: `Workflow file not found`

**解決策**:
```bash
# 初期化を実行
ai-workflow init

# またはファイルパスを明示的に指定
ai-workflow run -f ./path/to/workflow.yml workflow-name
```

## 今後の拡張予定

### 短期（次のマイルストーン）

- [ ] OpenAI エージェント対応
- [ ] ログ記録機能の強化（ファイル出力）
- [ ] Human-in-the-loop の実装
- [ ] エラーメッセージの改善

### 中期

- [ ] 並列実行サポート
- [ ] 条件分岐（if/else）
- [ ] ループ処理
- [ ] ワークフローテンプレート機能
- [ ] 実行履歴の管理

### 長期

- [ ] Web UI
- [ ] VSCode 拡張
- [ ] プラグインシステム
- [ ] クラウド連携
- [ ] チーム共有機能

## 参考情報

### 関連リンク

- Anthropic Claude API: https://docs.anthropic.com/
- Commander.js: https://github.com/tj/commander.js
- Zod: https://zod.dev/

### ライセンス

MIT License

### 作者

Yugo

### メンテナンス状況

Active development（2025年11月現在）

## 変更履歴

### v0.1.0 (2025-11-09)

- 初回リリース
- 基本的なワークフロー実行機能
- Claude エージェント対応
- CLI コマンド実装（init, run, list, logs）
- サンプルワークフロー追加
