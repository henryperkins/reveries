import { HostParadigm } from '../../types';

interface IsolationTask {
  id: string;
  paradigm: HostParadigm;
  task: string;
  context: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class IsolateLayerService {
  private static instance: IsolateLayerService;
  private tasks: Map<string, IsolationTask> = new Map();

  private constructor() {}

  public static getInstance(): IsolateLayerService {
    if (!IsolateLayerService.instance) {
      IsolateLayerService.instance = new IsolateLayerService();
    }
    return IsolateLayerService.instance;
  }

  async isolate(
    task: string,
    paradigm: HostParadigm,
    context: any,
    executeFunction: (task: string, context: any) => Promise<any>
  ): Promise<string> {
    const taskId = `${paradigm}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const isolationTask: IsolationTask = {
      id: taskId,
      paradigm,
      task,
      context,
      status: 'pending'
    };

    this.tasks.set(taskId, isolationTask);

    // Execute asynchronously
    this.executeIsolatedTask(taskId, executeFunction);

    return taskId;
  }

  private async executeIsolatedTask(
    taskId: string,
    executeFunction: (task: string, context: any) => Promise<any>
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'running';

    try {
      const result = await executeFunction(task.task, task.context);
      task.result = result;
      task.status = 'completed';
    } catch (error) {
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.status = 'failed';
    }
  }

  getTaskStatus(taskId: string): IsolationTask | undefined {
    return this.tasks.get(taskId);
  }

  async waitForTask(taskId: string, timeout: number = 30000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const task = this.tasks.get(taskId);
      if (!task) throw new Error('Task not found');
      
      if (task.status === 'completed') {
        return task.result;
      }
      
      if (task.status === 'failed') {
        throw new Error(task.error || 'Task failed');
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Task timeout');
  }

  getParadigmTasks(paradigm: HostParadigm): IsolationTask[] {
    return Array.from(this.tasks.values()).filter(task => task.paradigm === paradigm);
  }
}