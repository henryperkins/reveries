import { HostParadigm } from '../../types';

interface IsolationTask {
  id: string;
  paradigm: HostParadigm;
  task: string;
  context: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  memoryUsage?: number;
  sandbox?: SandboxContext;
}

interface SandboxContext {
  memoryLimit: string;
  timeout: number;
  networkAccess: boolean;
  isolationLevel: 'basic' | 'secure' | 'maximum';
}

interface ExecutionResult {
  output: any;
  artifacts?: ArtifactStub[];
  metrics: {
    executionTime: number;
    memoryUsed: number;
    success: boolean;
  };
}

interface ArtifactStub {
  type: 'text' | 'image' | 'data' | 'code';
  uri?: string;
  meta: {
    sha: string;
    length: number;
    contentType?: string;
  };
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
      status: 'pending',
      sandbox: this.createSandboxContext(paradigm)
    };

    this.tasks.set(taskId, isolationTask);

    // Execute asynchronously in sandbox
    this.executeInSandbox(taskId, executeFunction);

    return taskId;
  }

  /**
   * ACE-Graph style sandbox execution with resource limits
   */
  async executeSandboxed(
    code: string,
    paradigm: HostParadigm,
    options: Partial<SandboxContext> = {}
  ): Promise<ExecutionResult> {
    const sandbox = this.createSandboxContext(paradigm, options);
    const startTime = Date.now();
    
    try {
      // Simulate sandbox execution (in production would use actual sandbox like E2B)
      const result = await this.simulateSandboxExecution(code, sandbox);
      const executionTime = Date.now() - startTime;
      
      return {
        output: result,
        metrics: {
          executionTime,
          memoryUsed: Math.random() * 100, // Simulated memory usage
          success: true
        }
      };
    } catch (error) {
      return {
        output: null,
        metrics: {
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          success: false
        }
      };
    }
  }

  private async executeInSandbox(
    taskId: string,
    executeFunction: (task: string, context: any) => Promise<any>
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    task.startTime = Date.now();

    try {
      // Execute with sandbox constraints
      const result = await this.executeWithConstraints(task, executeFunction);
      task.result = result;
      task.status = 'completed';
      task.endTime = Date.now();
    } catch (error) {
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.status = 'failed';
      task.endTime = Date.now();
    }
  }

  private async executeWithConstraints(
    task: IsolationTask,
    executeFunction: (task: string, context: any) => Promise<any>
  ): Promise<any> {
    const timeout = task.sandbox?.timeout || 30000;
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sandbox timeout')), timeout)
    );

    // Execute with timeout
    const result = await Promise.race([
      executeFunction(task.task, task.context),
      timeoutPromise
    ]);

    return this.gateContext(result);
  }

  private createSandboxContext(paradigm: HostParadigm, options: Partial<SandboxContext> = {}): SandboxContext {
    // Paradigm-specific sandbox configurations
    const paradigmDefaults: Record<HostParadigm, SandboxContext> = {
      dolores: {
        memoryLimit: '1GB',
        timeout: 15000, // Quick action-oriented execution
        networkAccess: true, // Allow web access for implementation research
        isolationLevel: 'basic'
      },
      teddy: {
        memoryLimit: '2GB',
        timeout: 45000, // Comprehensive analysis takes time
        networkAccess: true,
        isolationLevel: 'secure'
      },
      bernard: {
        memoryLimit: '3GB',
        timeout: 60000, // Deep analytical processing
        networkAccess: false, // Focused internal analysis
        isolationLevel: 'maximum'
      },
      maeve: {
        memoryLimit: '2GB',
        timeout: 30000, // Strategic optimization
        networkAccess: true,
        isolationLevel: 'secure'
      }
    };

    return { ...paradigmDefaults[paradigm], ...options };
  }

  private async simulateSandboxExecution(code: string, sandbox: SandboxContext): Promise<any> {
    // Simulate execution based on sandbox constraints
    const delay = Math.min(sandbox.timeout / 10, 2000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate memory check
    if (Math.random() > 0.9) {
      throw new Error(`Sandbox OOM: exceeded ${sandbox.memoryLimit}`);
    }
    
    return `Executed in ${sandbox.isolationLevel} sandbox: ${code.substring(0, 50)}...`;
  }

  /**
   * ACE-Graph message gating - defer heavy content with stubs
   */
  private gateContext(result: any): any {
    if (this.isLargeContent(result)) {
      // Generate artifact stub for large content
      const stub = this.createArtifactStub(result);
      return {
        type: 'artifact_stub',
        stub,
        preview: this.generatePreview(result)
      };
    }
    return result;
  }

  private isLargeContent(content: any): boolean {
    const serialized = JSON.stringify(content);
    return serialized.length > 10000; // 10KB threshold
  }

  private createArtifactStub(content: any): ArtifactStub {
    const serialized = JSON.stringify(content);
    const hash = this.generateHash(serialized);
    
    return {
      type: this.detectContentType(content),
      meta: {
        sha: hash,
        length: serialized.length,
        contentType: typeof content
      }
    };
  }

  private detectContentType(content: any): ArtifactStub['type'] {
    if (typeof content === 'string') {
      if (content.includes('function') || content.includes('import')) return 'code';
      return 'text';
    }
    if (content instanceof ArrayBuffer || content instanceof Uint8Array) return 'image';
    return 'data';
  }

  private generatePreview(content: any): string {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    return str.substring(0, 200) + (str.length > 200 ? '...' : '');
  }

  private generateHash(content: string): string {
    // Simple hash for demo - in production would use crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
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