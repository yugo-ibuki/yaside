import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * コマンドを実行して結果を取得
 */
export async function executeCommand(command: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const execError = error as { code: number; stdout: string; stderr: string };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
        exitCode: execError.code,
      };
    }
    throw error;
  }
}

/**
 * 複数のコマンドを実行して結果を結合
 */
export async function executeCommands(commands: string[]): Promise<string> {
  const results: string[] = [];

  for (const command of commands) {
    const result = await executeCommand(command);
    results.push(`$ ${command}\n${result.stdout}\n${result.stderr}`);
  }

  return results.join('\n---\n');
}
