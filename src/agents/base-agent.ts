import type { AgentConfig } from '../types/index.js';

export interface AgentRequest {
  prompt: string;
  context?: string;
  systemPrompt?: string;
}

export interface AgentResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export abstract class BaseAgent {
  constructor(protected config: AgentConfig) {}

  abstract generate(request: AgentRequest): Promise<AgentResponse>;

  getModel(): string {
    return this.config.model || this.getDefaultModel();
  }

  getTemperature(): number {
    return this.config.temperature ?? 0.7;
  }

  protected abstract getDefaultModel(): string;
}
