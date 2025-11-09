import type { ContextConfig, WorkflowExecutionContext } from '../types/index.js';
import { getFilesContent, formatFilesForContext } from '../utils/file-utils.js';
import { executeCommands } from '../utils/command-utils.js';
import { replaceVariables } from '../utils/template-utils.js';

export class ContextBuilder {
  /**
   * コンテキストを構築
   */
  async build(
    config: ContextConfig | undefined,
    executionContext: WorkflowExecutionContext
  ): Promise<string> {
    if (!config) {
      return '';
    }

    const sections: string[] = [];

    // ファイルコンテンツを追加
    if (config.files && config.files.length > 0) {
      const processedPatterns = config.files.map((pattern) =>
        replaceVariables(pattern, executionContext)
      );

      const filesContent = await getFilesContent(processedPatterns);
      if (filesContent.size > 0) {
        sections.push('=== Files ===\n' + formatFilesForContext(filesContent));
      }
    }

    // コマンド実行結果を追加
    if (config.commands && config.commands.length > 0) {
      const processedCommands = config.commands.map((cmd) =>
        replaceVariables(cmd, executionContext)
      );

      const commandOutput = await executeCommands(processedCommands);
      if (commandOutput) {
        sections.push('=== Command Output ===\n' + commandOutput);
      }
    }

    // カスタム変数を追加
    if (config.variables) {
      const variablesStr = Object.entries(config.variables)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n');

      if (variablesStr) {
        sections.push('=== Variables ===\n' + variablesStr);
      }
    }

    return sections.join('\n\n');
  }
}
