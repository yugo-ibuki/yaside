import { parseWorkflowYaml } from './workflow/parser';
import { WorkflowExecutor } from './workflow/executor';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: yaside <workflow.yml>');
    process.exit(1);
  }

  const workflowFile = args[0];

  try {
    console.log(`Loading workflow from: ${workflowFile}\n`);
    const config = parseWorkflowYaml(workflowFile);

    const executor = new WorkflowExecutor(config);
    await executor.execute();
  } catch (error) {
    console.error('Error executing workflow:', error);
    process.exit(1);
  }
}

main();
