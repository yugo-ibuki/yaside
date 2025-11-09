import * as fs from 'fs/promises';
import * as path from 'path';
import YAML from 'yaml';
import { WorkflowFileSchema } from './schema.js';
import type { Workflow, WorkflowFile } from '../types/index.js';

export class WorkflowParser {
  /**
   * YAMLファイルからワークフローを読み込む
   */
  async parseFile(filePath: string): Promise<WorkflowFile> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      return this.parseYAML(content);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read workflow file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * YAML文字列をパースしてワークフローを作成
   */
  parseYAML(yamlContent: string): WorkflowFile {
    try {
      const parsed = YAML.parse(yamlContent);
      const validated = WorkflowFileSchema.parse(parsed);
      return validated;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse workflow YAML: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 特定のワークフローを名前で取得
   */
  async getWorkflow(filePath: string, workflowName: string): Promise<Workflow> {
    const workflowFile = await this.parseFile(filePath);
    const workflow = workflowFile.workflows[workflowName];

    if (!workflow) {
      throw new Error(
        `Workflow '${workflowName}' not found. Available workflows: ${Object.keys(workflowFile.workflows).join(', ')}`
      );
    }

    return {
      name: workflowName,
      ...workflow,
    };
  }

  /**
   * すべてのワークフロー名を取得
   */
  async listWorkflows(filePath: string): Promise<string[]> {
    const workflowFile = await this.parseFile(filePath);
    return Object.keys(workflowFile.workflows);
  }
}
