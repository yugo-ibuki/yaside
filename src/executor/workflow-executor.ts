import type {
  Workflow,
  Step,
  StepResult,
  ExecutionCallbacks,
  WorkflowExecutionContext,
} from '../types/index.js';
import { AgentFactory } from '../agents/index.js';
import { ContextBuilder } from '../context/index.js';
import { executeCommand } from '../utils/command-utils.js';
import { replaceVariables } from '../utils/template-utils.js';

export class WorkflowExecutor {
  private contextBuilder: ContextBuilder;

  constructor(
    private workflow: Workflow,
    private callbacks?: ExecutionCallbacks
  ) {
    this.contextBuilder = new ContextBuilder();
  }

  /**
   * ワークフローを実行
   */
  async run(input: string): Promise<StepResult[]> {
    const executionContext: WorkflowExecutionContext = {
      input,
      steps: [],
      variables: {},
    };

    try {
      for (let i = 0; i < this.workflow.steps.length; i++) {
        const step = this.workflow.steps[i];
        await this.callbacks?.onStepStart?.(step, i);

        const result = await this.executeStep(step, i, executionContext);
        executionContext.steps.push(result);

        await this.callbacks?.onStepComplete?.(step, result);

        // エラーハンドリング
        if (!result.success) {
          await this.callbacks?.onError?.(step, result.error!);

          if (step.on_failure) {
            const shouldContinue = await this.handleFailure(step, i, executionContext);
            if (!shouldContinue) {
              break;
            }
          } else {
            // on_failure が指定されていない場合は停止
            break;
          }
        }
      }

      await this.callbacks?.onWorkflowComplete?.(executionContext.steps);
      return executionContext.steps;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Workflow execution failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 単一ステップを実行
   */
  private async executeStep(
    step: Step,
    index: number,
    executionContext: WorkflowExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();

    try {
      let output = '';

      switch (step.type) {
        case 'agent':
          output = await this.executeAgentStep(step, executionContext);
          break;

        case 'command':
          output = await this.executeCommandStep(step, executionContext);
          break;

        case 'human_approval':
          output = await this.executeHumanApprovalStep(step, executionContext);
          break;

        default:
          throw new Error(`Unknown step type: ${(step as Step).type}`);
      }

      const endTime = new Date();

      return {
        stepName: step.name,
        stepIndex: index,
        output,
        success: true,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };
    } catch (error) {
      const endTime = new Date();

      return {
        stepName: step.name,
        stepIndex: index,
        output: '',
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };
    }
  }

  /**
   * AI エージェントステップを実行
   */
  private async executeAgentStep(
    step: Step,
    executionContext: WorkflowExecutionContext
  ): Promise<string> {
    if (!step.prompt) {
      throw new Error(`Agent step '${step.name}' requires a prompt`);
    }

    // エージェントを作成
    const agent = await AgentFactory.create(step.agent);

    // コンテキストを構築
    const context = await this.contextBuilder.build(step.context, executionContext);

    // プロンプトの変数を置換
    const prompt = replaceVariables(step.prompt, executionContext);

    // エージェントを実行
    const response = await agent.generate({
      prompt,
      context,
    });

    return response.content;
  }

  /**
   * コマンドステップを実行
   */
  private async executeCommandStep(
    step: Step,
    executionContext: WorkflowExecutionContext
  ): Promise<string> {
    if (!step.command) {
      throw new Error(`Command step '${step.name}' requires a command`);
    }

    // コマンドの変数を置換
    const command = replaceVariables(step.command, executionContext);

    // コマンドを実行
    const result = await executeCommand(command);

    if (result.exitCode !== 0) {
      throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
    }

    return result.stdout;
  }

  /**
   * 人間承認ステップを実行
   */
  private async executeHumanApprovalStep(
    step: Step,
    _executionContext: WorkflowExecutionContext
  ): Promise<string> {
    // 実装予定: 人間の承認を待つ
    // 現時点では自動承認
    console.log(`Human approval required for step: ${step.name}`);
    return 'Approved (auto)';
  }

  /**
   * 失敗時の処理
   */
  private async handleFailure(
    step: Step,
    stepIndex: number,
    _executionContext: WorkflowExecutionContext
  ): Promise<boolean> {
    const failure = step.on_failure;

    if (!failure) {
      return false;
    }

    // 文字列形式の場合 (例: "retry_step[2]")
    if (typeof failure === 'string') {
      if (failure === 'continue') {
        return true;
      }
      if (failure === 'stop') {
        return false;
      }
      // retry_step[N] の形式
      const match = failure.match(/retry_step\[(\d+)\]/);
      if (match) {
        // 実装予定: ステップのリトライ
        console.log(`Would retry step ${match[1]}`);
        return false;
      }
    }

    // オブジェクト形式の場合
    if (typeof failure === 'object') {
      switch (failure.action) {
        case 'continue':
          return true;
        case 'stop':
          return false;
        case 'retry':
          // 実装予定: リトライロジック
          console.log(`Would retry step ${stepIndex}`);
          return false;
        default:
          return false;
      }
    }

    return false;
  }
}
