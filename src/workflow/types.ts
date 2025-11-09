/**
 * ワークフローのステップ定義
 */
export interface WorkflowStep {
  /** ステップ名 */
  name: string;
  /** 実行するコマンド */
  command: string;
  /** 参照するファイルパス */
  reference?: string;
  /** プロンプト */
  prompt: string;
  /** グループ名（同じグループのステップはセットとして繰り返し実行される） */
  group?: string;
}

/**
 * グループ設定
 */
export interface GroupSettings {
  /** グループ名 */
  groupName: string;
  /** 実行回数 */
  attempt: number;
}

/**
 * ワークフロー設定
 */
export interface Settings {
  /** グループごとの設定（複数のグループ設定に対応） */
  groups?: GroupSettings[];
  /** 単一グループ設定（後方互換性のため） */
  groupName?: string;
  attempt?: number;
}

/**
 * ワークフロー全体の定義
 */
export interface WorkflowConfig {
  workflows: {
    steps: {
      [key: string]: WorkflowStep;
    };
  };
  settings?: Settings;
}

/**
 * 実行するステップの情報
 */
export interface ExecutableStep {
  key: string;
  step: WorkflowStep;
  attemptNumber?: number;
}
