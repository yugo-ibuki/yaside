import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { WorkflowParser } from '../parser/index.js';

export interface ListOptions {
  file?: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  try {
    const workflowPath = options.file || path.join(process.cwd(), 'workflow.yml');

    // ファイルの存在確認
    try {
      await fs.access(workflowPath);
    } catch {
      console.error(chalk.red(`Error: Workflow file not found: ${workflowPath}`));
      console.log();
      console.log('Run ' + chalk.cyan('ai-workflow init') + ' to create a workflow file');
      process.exit(1);
    }

    const parser = new WorkflowParser();
    const workflowFile = await parser.parseFile(workflowPath);

    console.log(chalk.bold('Available workflows:'));
    console.log();

    const workflows = Object.entries(workflowFile.workflows);

    if (workflows.length === 0) {
      console.log(chalk.gray('  No workflows found'));
      return;
    }

    for (const [name, workflow] of workflows) {
      console.log(`  ${chalk.cyan(name)}`);
      if (workflow.description) {
        console.log(`    ${chalk.gray(workflow.description)}`);
      }
      console.log(`    ${chalk.gray(`${workflow.steps.length} step(s)`)}`);
      console.log();
    }

    console.log(`Total: ${workflows.length} workflow(s)`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }
}
