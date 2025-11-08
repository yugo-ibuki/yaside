import * as fs from 'fs/promises';
import { glob } from 'glob';

/**
 * Glob パターンでファイルを検索してコンテンツを取得
 */
export async function getFilesContent(patterns: string[]): Promise<Map<string, string>> {
  const filesContent = new Map<string, string>();

  for (const pattern of patterns) {
    const files = await glob(pattern, { ignore: ['node_modules/**', 'dist/**', '.git/**'] });

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        filesContent.set(file, content);
      } catch (error) {
        console.warn(`Warning: Could not read file ${file}`);
      }
    }
  }

  return filesContent;
}

/**
 * ファイルコンテンツを読みやすい形式に変換
 */
export function formatFilesForContext(filesContent: Map<string, string>): string {
  const sections: string[] = [];

  for (const [filePath, content] of filesContent.entries()) {
    sections.push(`--- ${filePath} ---\n${content}\n`);
  }

  return sections.join('\n');
}
