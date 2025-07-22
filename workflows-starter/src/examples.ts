// <docs-tag name="simple-workflow-example">
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

type Env = Record<string, unknown>;
type Params = Record<string, unknown>;

// Create your own class that implements a Workflow
export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
	// Define a run() method
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		// Define one or more steps that optionally return state.
		const state = await step.do('my first step', async () => {
			return [1, 2, 3];
		});

		await step.do('my second step', async () => {
			for (const data of state) {
				// Do something with your state
				console.log('Processing:', data);
			}
		});
	}
}
// </docs-tag name="simple-workflow-example">
