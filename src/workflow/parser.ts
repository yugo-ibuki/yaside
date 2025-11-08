import * as fs from 'fs';
import * as YAML from 'yaml';
import { WorkflowConfig } from './types';

/**
 * YAMLファイルを読み込んでパースする
 * @param filePath YAMLファイルのパス
 * @returns パースされたワークフロー設定
 */
export function parseWorkflowYaml(filePath: string): WorkflowConfig {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const config = YAML.parse(fileContent) as WorkflowConfig;

  if (!config.workflows || !config.workflows.steps) {
    throw new Error('Invalid workflow configuration: missing workflows.steps');
  }

  return config;
}
