import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { WorkflowParser } from '../parser/index.js';
import { WorkflowExecutor } from '../executor/index.js';
import type { Step, StepResult } from '../types/index.js';

export interface RunOptions {
  file?: string;
  dryRun?: boolean;
}

export async function runCommand(
  workflowName: string,
  input: string,
  options: RunOptions
): Promise<void> {
  const spinner = ora();

  try {
    // ワークフローファイルのパス
    const workflowPath = options.file || path.join(process.cwd(), 'workflow.yml');

    // ファイルの存在確認
    try {
      await fs.access(workflowPath);
    } catch {
      console.error(
        chalk.red(`Error: Workflow file not found: ${workflowPath}`)
      );
      console.log();
      console.log('Run ' + chalk.cyan('ai-workflow init') + ' to create a workflow file');
      process.exit(1);
    }

    // ワークフローを読み込む
    spinner.start('Loading workflow...');
    const parser = new WorkflowParser();
    const workflow = await parser.getWorkflow(workflowPath, workflowName);
    spinner.succeed(`Loaded workflow: ${chalk.bold(workflow.name)}`);

    if (workflow.description) {
      console.log(chalk.gray(`  ${workflow.description}`));
    }

    console.log();

    // Dry run の場合は実行せずに表示だけ
    if (options.dryRun) {
      console.log(chalk.yellow('DRY RUN MODE - Not executing steps'));
      console.log();
      console.log('Steps:');
      workflow.steps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.name} (${step.type})`);
      });
      return;
    }

    // ワークフローを実行
    let currentSpinner: Ora | null = null;

    const executor = new WorkflowExecutor(workflow, {
      onStepStart: (step: Step, index: number) => {
        currentSpinner = ora(`[${index + 1}/${workflow.steps.length}] ${step.name}`).start();
      },
      onStepComplete: (step: Step, result: StepResult) => {
        if (currentSpinner) {
          if (result.success) {
            currentSpinner.succeed(
              `[${result.stepIndex + 1}/${workflow.steps.length}] ${step.name} ${chalk.gray(`(${result.duration}ms)`)}`
            );
          } else {
            currentSpinner.fail(
              `[${result.stepIndex + 1}/${workflow.steps.length}] ${step.name} ${chalk.red('FAILED')}`
            );
          }
        }
      },
      onError: (_step: Step, error: Error) => {
        console.error(chalk.red(`  Error: ${error.message}`));
      },
      onWorkflowComplete: (results: StepResult[]) => {
        console.log();
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        if (failed === 0) {
          console.log(chalk.green(`✨ Workflow completed successfully!`));
        } else {
          console.log(
            chalk.yellow(`⚠ Workflow completed with errors: ${successful} succeeded, ${failed} failed`)
          );
        }

        console.log();
        console.log('Final output:');
        const lastResult = results[results.length - 1];
        if (lastResult && lastResult.output) {
          console.log(chalk.gray('---'));
          console.log(lastResult.output);
          console.log(chalk.gray('---'));
        }
      },
    });

    await executor.run(input);
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail();
    }

    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }
}
