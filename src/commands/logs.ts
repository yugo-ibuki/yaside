import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { ConfigManager } from '../config/index.js';

export interface LogsOptions {
  last?: boolean;
}

export async function logsCommand(options: LogsOptions): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();
    const logDir = await configManager.getLogDir();

    // ログディレクトリの存在確認
    try {
      await fs.access(logDir);
    } catch {
      console.log(chalk.yellow('No logs found yet'));
      return;
    }

    // ログファイル一覧を取得
    const files = await fs.readdir(logDir);
    const logFiles = files.filter((f) => f.endsWith('.log')).sort().reverse();

    if (logFiles.length === 0) {
      console.log(chalk.yellow('No logs found yet'));
      return;
    }

    if (options.last) {
      // 最後のログを表示
      const lastLog = logFiles[0];
      const logPath = path.join(logDir, lastLog);
      const content = await fs.readFile(logPath, 'utf-8');

      console.log(chalk.bold(`Log: ${lastLog}`));
      console.log(chalk.gray('---'));
      console.log(content);
      console.log(chalk.gray('---'));
    } else {
      // ログ一覧を表示
      console.log(chalk.bold('Available logs:'));
      console.log();

      for (const logFile of logFiles) {
        console.log(`  ${chalk.cyan(logFile)}`);
      }

      console.log();
      console.log(`Total: ${logFiles.length} log(s)`);
      console.log();
      console.log('Use ' + chalk.cyan('--last') + ' to view the most recent log');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }
}
