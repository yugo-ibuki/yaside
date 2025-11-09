import type { WorkflowExecutionContext } from '../types/index.js';

/**
 * テンプレート変数を置換
 * 例: "{{input}}" -> ユーザー入力, "$previous_output" -> 前ステップの出力
 */
export function replaceVariables(
  template: string,
  context: WorkflowExecutionContext
): string {
  let result = template;

  // {{input}} を置換
  result = result.replace(/\{\{input\}\}/g, context.input);

  // $previous_output を置換
  if (context.steps.length > 0) {
    const previousStep = context.steps[context.steps.length - 1];
    result = result.replace(/\$previous_output/g, previousStep?.output || '');
  }

  // $step[N].output を置換
  result = result.replace(/\$step\[(\d+)\]\.output/g, (_, index) => {
    const stepIndex = parseInt(index, 10);
    return context.steps[stepIndex]?.output || '';
  });

  // $step[name].output を置換
  result = result.replace(/\$step\[(['"]?)([^'"[\]]+)\1\]\.output/g, (_, __, name) => {
    const step = context.steps.find((s) => s.stepName === name);
    return step?.output || '';
  });

  // カスタム変数を置換
  for (const [key, value] of Object.entries(context.variables)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value));
  }

  return result;
}
