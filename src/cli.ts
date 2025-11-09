#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { listCommand } from './commands/list.js';
import { logsCommand } from './commands/logs.js';

const program = new Command();

program
  .name('ai-workflow')
  .description('AI エージェントを使った開発ワークフローを自動化するためのツール')
  .version('0.1.0');

// init コマンド
program
  .command('init')
  .description('ワークフローを初期化')
  .action(initCommand);

// run コマンド
program
  .command('run')
  .description('ワークフローを実行')
  .argument('<workflow-name>', 'ワークフロー名')
  .argument('[input]', 'ユーザー入力', '')
  .option('-f, --file <path>', 'ワークフローファイルのパス')
  .option('--dry-run', '実際には実行せず、プレビューのみ')
  .action(runCommand);

// list コマンド
program
  .command('list')
  .description('利用可能なワークフロー一覧を表示')
  .option('-f, --file <path>', 'ワークフローファイルのパス')
  .action(listCommand);

// logs コマンド
program
  .command('logs')
  .description('実行ログを表示')
  .option('--last', '最後の実行ログを表示')
  .action(logsCommand);

program.parse();
