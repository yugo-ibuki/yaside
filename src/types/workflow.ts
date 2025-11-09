/**
 * ワークフロー定義の型
 */

export type StepType = 'agent' | 'command' | 'human_approval';

export type AgentType = 'claude' | 'openai' | 'cursor';

export interface AgentConfig {
  type: AgentType;
  model?: string;
  temperature?: number;
}

export interface ContextConfig {
  files?: string[];
  commands?: string[];
  variables?: Record<string, unknown>;
}

export interface FailureAction {
  action: 'continue' | 'stop' | 'retry';
  retry_step?: number | string;
  max_retries?: number;
}

export interface Step {
  name: string;
  type: StepType;
  agent?: AgentConfig;
  command?: string;
  context?: ContextConfig;
  prompt?: string;
  on_success?: string;
  on_failure?: FailureAction | string;
}

export interface Workflow {
  name: string;
  description?: string;
  steps: Step[];
}

export interface WorkflowFile {
  workflows: Record<string, Omit<Workflow, 'name'>>;
}

/**
 * 実行時の型
 */

export interface StepResult {
  stepName: string;
  stepIndex: number;
  output: string;
  success: boolean;
  error?: Error;
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface WorkflowExecutionContext {
  input: string;
  steps: StepResult[];
  variables: Record<string, unknown>;
}

export interface ExecutionCallbacks {
  onStepStart?: (step: Step, index: number) => void | Promise<void>;
  onStepComplete?: (step: Step, result: StepResult) => void | Promise<void>;
  onError?: (step: Step, error: Error) => void | Promise<void>;
  onWorkflowComplete?: (results: StepResult[]) => void | Promise<void>;
}

export interface GlobalConfig {
  default_agent?: AgentConfig;
  api_keys?: {
    anthropic?: string;
    openai?: string;
  };
  log_level?: 'debug' | 'info' | 'warn' | 'error';
  log_dir?: string;
}
