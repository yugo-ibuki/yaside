import type { AgentConfig } from '../types/index.js';
import { BaseAgent } from './base-agent.js';
import { ClaudeAgent } from './claude-agent.js';
import { ConfigManager } from '../config/config-manager.js';

export class AgentFactory {
  /**
   * エージェントを作成
   */
  static async create(config?: AgentConfig): Promise<BaseAgent> {
    // 設定がない場合はデフォルト設定を使用
    if (!config) {
      const configManager = ConfigManager.getInstance();
      const globalConfig = await configManager.load();
      config = globalConfig.default_agent || { type: 'claude' };
    }

    switch (config.type) {
      case 'claude':
        return await ClaudeAgent.create(config);

      case 'openai':
        throw new Error('OpenAI agent is not yet implemented');

      case 'cursor':
        throw new Error('Cursor agent is not yet implemented');

      default:
        throw new Error(`Unknown agent type: ${(config as AgentConfig).type}`);
    }
  }
}
