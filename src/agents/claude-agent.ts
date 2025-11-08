import Anthropic from '@anthropic-ai/sdk';
import type { AgentConfig } from '../types/index.js';
import { BaseAgent, type AgentRequest, type AgentResponse } from './base-agent.js';
import { ConfigManager } from '../config/config-manager.js';

export class ClaudeAgent extends BaseAgent {
  private client: Anthropic;

  constructor(config: AgentConfig, apiKey?: string) {
    super(config);

    if (!apiKey) {
      throw new Error(
        'Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or configure it in ~/.ai-workflow/config.yml'
      );
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  static async create(config: AgentConfig): Promise<ClaudeAgent> {
    const configManager = ConfigManager.getInstance();
    const apiKey = await configManager.getApiKey('anthropic');
    return new ClaudeAgent(config, apiKey);
  }

  async generate(request: AgentRequest): Promise<AgentResponse> {
    const messages: Anthropic.MessageParam[] = [];

    // コンテキストを追加
    if (request.context) {
      messages.push({
        role: 'user',
        content: `Context:\n${request.context}`,
      });
    }

    // プロンプトを追加
    messages.push({
      role: 'user',
      content: request.prompt,
    });

    try {
      const response = await this.client.messages.create({
        model: this.getModel(),
        max_tokens: 4096,
        temperature: this.getTemperature(),
        system: request.systemPrompt,
        messages,
      });

      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('\n');

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude API error: ${error.message}`);
      }
      throw error;
    }
  }

  protected getDefaultModel(): string {
    return 'claude-sonnet-4-5-20250929';
  }
}
