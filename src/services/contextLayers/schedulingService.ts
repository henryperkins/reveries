import { HostParadigm } from '@/types';

interface Task {
  id: string;
  cost: number;
  paradigm: HostParadigm;
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retryCount: number;
  executeFunction: () => Promise<any>;
}

export class SchedulingService {
  private static instance: SchedulingService;
  private tasks: Map<string, Task> = new Map();
  private runningTasks: Set<string> = new Set();
  
  // ACE-Graph scheduling parameters
  private readonly GLOBAL_BUDGET = 1000; // Token/cost budget
  private readonly CONCURRENCY_LIMIT = 8; // λ = 8 from docs
  private readonly MAX_RETRIES = 3;

  private constructor() {}

  public static getInstance(): SchedulingService {
    if (!SchedulingService.instance) {
      SchedulingService.instance = new SchedulingService();
    }
    return SchedulingService.instance;
  }

  /**
   * ACE-Graph Scheduling Policy:
   * 1. Sort tasks by cost descending
   * 2. While sum(running_costs) < budget and |running| < λ: spawn next
   * 3. Dead agent after 3 retries → flag & continue
   */
  addTask(
    id: string,
    cost: number,
    paradigm: HostParadigm,
    executeFunction: () => Promise<any>,
    priority: number = 0
  ): void {
    const task: Task = {
      id,
      cost,
      paradigm,
      priority,
      status: 'pending',
      retryCount: 0,
      executeFunction
    };

    this.tasks.set(id, task);
    this.scheduleNext();
  }

  private scheduleNext(): void {
    // Get pending tasks sorted by cost (descending) then priority
    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        if (a.cost !== b.cost) return b.cost - a.cost; // Higher cost first
        return b.priority - a.priority; // Higher priority first
      });

    // Calculate current running cost
    const runningCost = Array.from(this.runningTasks)
      .map(id => this.tasks.get(id)?.cost || 0)
      .reduce((sum, cost) => sum + cost, 0);

    // Schedule tasks within budget and concurrency limits
    for (const task of pendingTasks) {
      if (this.runningTasks.size >= this.CONCURRENCY_LIMIT) break;
      if (runningCost + task.cost > this.GLOBAL_BUDGET) break;

      this.executeTask(task);
    }
  }

  private async executeTask(task: Task): Promise<void> {
    task.status = 'running';
    this.runningTasks.add(task.id);

    try {
      await task.executeFunction();
      task.status = 'completed';
    } catch (error) {
      console.warn(`Task ${task.id} failed:`, error);
      task.retryCount++;
      
      if (task.retryCount < this.MAX_RETRIES) {
        task.status = 'pending';
        // Exponential backoff
        setTimeout(() => this.scheduleNext(), Math.pow(2, task.retryCount) * 1000);
      } else {
        task.status = 'failed';
        console.error(`Task ${task.id} failed after ${this.MAX_RETRIES} retries`);
      }
    } finally {
      this.runningTasks.delete(task.id);
      this.scheduleNext(); // Try to schedule next tasks
    }
  }

  getTaskStatus(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getRunningTasks(): Task[] {
    return Array.from(this.runningTasks)
      .map(id => this.tasks.get(id))
      .filter(task => task !== undefined) as Task[];
  }

  getTasksByParadigm(paradigm: HostParadigm): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.paradigm === paradigm);
  }

  getCurrentBudgetUsage(): { used: number; available: number; utilization: number } {
    const used = Array.from(this.runningTasks)
      .map(id => this.tasks.get(id)?.cost || 0)
      .reduce((sum, cost) => sum + cost, 0);
    
    return {
      used,
      available: this.GLOBAL_BUDGET - used,
      utilization: used / this.GLOBAL_BUDGET
    };
  }

  clearCompletedTasks(): void {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.tasks.delete(id);
      }
    }
  }
}