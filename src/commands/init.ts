import * as fs from 'fs/promises';
import * as path from 'path';
import YAML from 'yaml';
import chalk from 'chalk';
import { ConfigManager } from '../config/index.js';

const defaultWorkflow = {
  workflows: {
    example: {
      description: 'サンプルワークフロー',
      steps: [
        {
          name: '実装',
          type: 'agent',
          agent: {
            type: 'claude',
            model: 'claude-sonnet-4-5',
          },
          context: {
            files: ['src/**/*.ts'],
          },
          prompt: '{{input}}を実装してください',
        },
        {
          name: 'レビュー',
          type: 'agent',
          agent: {
            type: 'claude',
          },
          context: {
            files: ['$previous_output'],
          },
          prompt: 'コードレビューをしてください',
        },
      ],
    },
  },
};

export async function initCommand(): Promise<void> {
  try {
    console.log(chalk.blue('Initializing ai-workflow...'));

    // グローバル設定ディレクトリを初期化
    const configManager = ConfigManager.getInstance();
    await configManager.initialize();

    console.log(chalk.green('✓ Created global config directory: ~/.ai-workflow'));

    // プロジェクトローカルのworkflow.ymlを作成
    const workflowPath = path.join(process.cwd(), 'workflow.yml');

    try {
      await fs.access(workflowPath);
      console.log(chalk.yellow('⚠ workflow.yml already exists, skipping...'));
    } catch {
      const yamlContent = YAML.stringify(defaultWorkflow, { indent: 2 });
      await fs.writeFile(workflowPath, yamlContent, 'utf-8');
      console.log(chalk.green('✓ Created workflow.yml'));
    }

    // .envファイルのテンプレートを作成
    const envPath = path.join(process.cwd(), '.env.example');
    const envContent = `# AI Workflow Environment Variables
ANTHROPIC_API_KEY=your_api_key_here
# OPENAI_API_KEY=your_api_key_here
`;

    try {
      await fs.access(envPath);
    } catch {
      await fs.writeFile(envPath, envContent, 'utf-8');
      console.log(chalk.green('✓ Created .env.example'));
    }

    console.log();
    console.log(chalk.green('✨ Initialization complete!'));
    console.log();
    console.log('Next steps:');
    console.log('  1. Set your API key:');
    console.log(chalk.cyan('     export ANTHROPIC_API_KEY="your-api-key"'));
    console.log('  2. Edit workflow.yml to define your workflow');
    console.log('  3. Run a workflow:');
    console.log(chalk.cyan('     ai-workflow run example "your input"'));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }
}
