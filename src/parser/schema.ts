import { z } from 'zod';

/**
 * Zod スキーマによるワークフロー定義のバリデーション
 */

const AgentConfigSchema = z.object({
  type: z.enum(['claude', 'openai', 'cursor']),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

const ContextConfigSchema = z.object({
  files: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  variables: z.record(z.unknown()).optional(),
});

const FailureActionSchema = z.union([
  z.string(), // "retry_step[2]" のような文字列形式
  z.object({
    action: z.enum(['continue', 'stop', 'retry']),
    retry_step: z.union([z.number(), z.string()]).optional(),
    max_retries: z.number().optional(),
  }),
]);

const StepSchema = z.object({
  name: z.string(),
  type: z.enum(['agent', 'command', 'human_approval']),
  agent: AgentConfigSchema.optional(),
  command: z.string().optional(),
  context: ContextConfigSchema.optional(),
  prompt: z.string().optional(),
  on_success: z.string().optional(),
  on_failure: FailureActionSchema.optional(),
});

const WorkflowSchema = z.object({
  description: z.string().optional(),
  steps: z.array(StepSchema).min(1),
});

const WorkflowFileSchema = z.object({
  workflows: z.record(WorkflowSchema),
});

export const GlobalConfigSchema = z.object({
  default_agent: AgentConfigSchema.optional(),
  api_keys: z
    .object({
      anthropic: z.string().optional(),
      openai: z.string().optional(),
    })
    .optional(),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  log_dir: z.string().optional(),
});

export { WorkflowFileSchema, WorkflowSchema, StepSchema };
