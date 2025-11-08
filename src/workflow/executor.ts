import { WorkflowConfig, WorkflowStep, ExecutableStep } from './types';
import { execSync } from 'child_process';
import * as fs from 'fs';

/**
 * ワークフローを実行する
 * @param config ワークフロー設定
 */
export class WorkflowExecutor {
  private config: WorkflowConfig;

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  /**
   * ワークフロー全体を実行
   */
  public async execute(): Promise<void> {
    const executionPlan = this.buildExecutionPlan();

    console.log('=== Workflow Execution Plan ===');
    executionPlan.forEach((item, index) => {
      const attemptInfo = item.attemptNumber ? ` (attempt ${item.attemptNumber})` : '';
      console.log(`${index + 1}. ${item.step.name}${attemptInfo}`);
    });
    console.log('==============================\n');

    for (const item of executionPlan) {
      await this.executeStep(item);
    }

    console.log('\n=== Workflow Completed ===');
  }

  /**
   * 実行計画を構築する
   * グループ化されたステップを繰り返し実行できるように展開
   */
  private buildExecutionPlan(): ExecutableStep[] {
    const steps = this.config.workflows.steps;
    const stepKeys = Object.keys(steps);
    const executionPlan: ExecutableStep[] = [];

    // グループ設定を取得
    const groupSettings = this.getGroupSettings();

    // ステップをグループごとに分類
    const groupedSteps: { [group: string]: { key: string; step: WorkflowStep }[] } = {};
    const ungroupedSteps: { key: string; step: WorkflowStep }[] = [];

    for (const key of stepKeys) {
      const step = steps[key];
      if (step.group) {
        if (!groupedSteps[step.group]) {
          groupedSteps[step.group] = [];
        }
        groupedSteps[step.group].push({ key, step });
      } else {
        ungroupedSteps.push({ key, step });
      }
    }

    // 実行計画を構築（YAMLの定義順を維持）
    let currentGroup: string | null = null;
    let groupBuffer: { key: string; step: WorkflowStep }[] = [];

    for (const key of stepKeys) {
      const step = steps[key];

      if (step.group) {
        // グループが変わった場合、前のグループを実行計画に追加
        if (currentGroup && currentGroup !== step.group && groupBuffer.length > 0) {
          this.addGroupToPlan(executionPlan, currentGroup, groupBuffer, groupSettings);
          groupBuffer = [];
        }

        currentGroup = step.group;
        groupBuffer.push({ key, step });
      } else {
        // グループなしのステップの前に、バッファにあるグループを追加
        if (currentGroup && groupBuffer.length > 0) {
          this.addGroupToPlan(executionPlan, currentGroup, groupBuffer, groupSettings);
          groupBuffer = [];
          currentGroup = null;
        }

        // グループなしのステップは1回だけ実行
        executionPlan.push({ key, step });
      }
    }

    // 最後のグループを追加
    if (currentGroup && groupBuffer.length > 0) {
      this.addGroupToPlan(executionPlan, currentGroup, groupBuffer, groupSettings);
    }

    return executionPlan;
  }

  /**
   * グループを実行計画に追加（繰り返し回数を考慮）
   */
  private addGroupToPlan(
    executionPlan: ExecutableStep[],
    groupName: string,
    steps: { key: string; step: WorkflowStep }[],
    groupSettings: Map<string, number>
  ): void {
    const attempts = groupSettings.get(groupName) || 1;

    for (let i = 1; i <= attempts; i++) {
      for (const { key, step } of steps) {
        executionPlan.push({
          key,
          step,
          attemptNumber: attempts > 1 ? i : undefined,
        });
      }
    }
  }

  /**
   * グループ設定を取得
   */
  private getGroupSettings(): Map<string, number> {
    const settings = new Map<string, number>();

    if (!this.config.settings) {
      return settings;
    }

    // 新しい形式（groups配列）
    if (this.config.settings.groups) {
      for (const group of this.config.settings.groups) {
        settings.set(group.groupName, group.attempt);
      }
    }

    // 古い形式（単一グループ）- 後方互換性
    if (this.config.settings.groupName && this.config.settings.attempt) {
      settings.set(this.config.settings.groupName, this.config.settings.attempt);
    }

    return settings;
  }

  /**
   * 個別のステップを実行
   */
  private async executeStep(item: ExecutableStep): Promise<void> {
    const { key, step, attemptNumber } = item;
    const attemptInfo = attemptNumber ? ` (Attempt ${attemptNumber})` : '';

    console.log(`\n--- Executing: ${step.name}${attemptInfo} ---`);
    console.log(`Command: ${step.command}`);
    console.log(`Prompt: ${step.prompt}`);

    if (step.reference) {
      console.log(`Reference: ${step.reference}`);

      // 参照ファイルの内容を表示
      if (fs.existsSync(step.reference)) {
        console.log(`\n[Reference Content]`);
        const content = fs.readFileSync(step.reference, 'utf-8');
        console.log(content);
      } else {
        console.log(`Warning: Reference file not found: ${step.reference}`);
      }
    }

    // 実際のコマンド実行（デモ用）
    try {
      console.log(`\n[Executing command: ${step.command}]`);
      // 実際の環境では、ここでコマンドを実行します
      // execSync(step.command, { stdio: 'inherit' });
      console.log(`✓ Step completed successfully`);
    } catch (error) {
      console.error(`✗ Step failed:`, error);
      throw error;
    }
  }
}
