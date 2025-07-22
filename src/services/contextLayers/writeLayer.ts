import { HostParadigm } from '@/types';
import crypto from 'crypto';

type MemoryType = 'procedural' | 'episodic' | 'semantic';

interface Memory {
  content: any;
  timestamp: number;
  paradigm: HostParadigm;
  density: number;
  type: MemoryType;
  taskId?: string;
  embedding?: number[];
}

export class WriteLayerService {
  private static instance: WriteLayerService;
  private scratchpad: Map<string, Memory> = new Map();
  private memoryStore: Map<string, Memory> = new Map();
  
  private readonly SCRATCHPAD_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MEMORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  public static getInstance(): WriteLayerService {
    if (!WriteLayerService.instance) {
      WriteLayerService.instance = new WriteLayerService();
    }
    return WriteLayerService.instance;
  }

  write(key: string, value: any, density: number, paradigm: HostParadigm): void {
    // Determine memory type based on content
    const memoryType = this.classifyMemoryType(key, value);
    
    const memory: Memory = {
      content: value,
      timestamp: Date.now(),
      paradigm,
      density,
      type: memoryType,
      taskId: this.generateTaskId(key, paradigm),
      embedding: this.generateEmbedding(value)
    };

    if (density > 80) {
      // High density: long-term memory
      this.memoryStore.set(`${paradigm}:${key}`, memory);
    } else {
      // Lower density: short-term scratchpad
      this.scratchpad.set(`${paradigm}:${key}`, memory);
    }

    this.cleanup();
  }

  /**
   * ACE-Graph style memory writing with explicit type classification
   */
  writeMemory(taskId: string, content: string, memoryType: MemoryType, paradigm: HostParadigm, density = 50): void {
    const memory: Memory = {
      content: { task: taskId, body: content, type: memoryType },
      timestamp: Date.now(),
      paradigm,
      density,
      type: memoryType,
      taskId,
      embedding: this.generateEmbedding(content)
    };

    const key = `${memoryType}:${taskId}`;
    if (density > 80) {
      this.memoryStore.set(`${paradigm}:${key}`, memory);
    } else {
      this.scratchpad.set(`${paradigm}:${key}`, memory);
    }

    this.cleanup();
  }

  read(key: string, paradigm?: HostParadigm): any {
    const fullKey = paradigm ? `${paradigm}:${key}` : key;
    
    // Check scratchpad first
    const scratchValue = this.scratchpad.get(fullKey);
    if (scratchValue && Date.now() - scratchValue.timestamp < this.SCRATCHPAD_TTL) {
      return scratchValue.content;
    }

    // Check memory store
    const memoryValue = this.memoryStore.get(fullKey);
    if (memoryValue && Date.now() - memoryValue.timestamp < this.MEMORY_TTL) {
      return memoryValue.content;
    }

    return null;
  }

  getParadigmMemories(paradigm: HostParadigm): Map<string, any> {
    const memories = new Map<string, any>();
    
    // Collect from both stores
    for (const [key, memory] of this.scratchpad.entries()) {
      if (key.startsWith(`${paradigm}:`) && Date.now() - memory.timestamp < this.SCRATCHPAD_TTL) {
        memories.set(key.replace(`${paradigm}:`, ''), memory.content);
      }
    }
    
    for (const [key, memory] of this.memoryStore.entries()) {
      if (key.startsWith(`${paradigm}:`) && Date.now() - memory.timestamp < this.MEMORY_TTL) {
        memories.set(key.replace(`${paradigm}:`, ''), memory.content);
      }
    }

    return memories;
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Clean scratchpad
    for (const [key, memory] of this.scratchpad.entries()) {
      if (now - memory.timestamp > this.SCRATCHPAD_TTL) {
        this.scratchpad.delete(key);
      }
    }
    
    // Clean memory store
    for (const [key, memory] of this.memoryStore.entries()) {
      if (now - memory.timestamp > this.MEMORY_TTL) {
        this.memoryStore.delete(key);
      }
    }
  }

  private classifyMemoryType(key: string, value: any): MemoryType {
    const keyLower = key.toLowerCase();
    const valueStr = typeof value === 'string' ? value.toLowerCase() : JSON.stringify(value).toLowerCase();
    
    // Procedural: steps, actions, how-to
    if (keyLower.includes('step') || keyLower.includes('action') || keyLower.includes('process') ||
        valueStr.includes('step') || valueStr.includes('how to') || valueStr.includes('procedure')) {
      return 'procedural';
    }
    
    // Episodic: events, experiences, specific instances
    if (keyLower.includes('query') || keyLower.includes('result') || keyLower.includes('research') ||
        valueStr.includes('when') || valueStr.includes('happened') || valueStr.includes('experience')) {
      return 'episodic';
    }
    
    // Semantic: facts, concepts, general knowledge
    return 'semantic';
  }

  private generateTaskId(key: string, paradigm: HostParadigm): string {
    const timestamp = Date.now().toString();
    return crypto.createHash('md5').update(`${paradigm}:${key}:${timestamp}`).digest('hex').substring(0, 12);
  }

  private generateEmbedding(content: any): number[] {
    // Simplified embedding - in production would use actual embedding model
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding: number[] = [];
    
    for (let i = 0; i < Math.min(128, hash.length); i++) {
      embedding.push((hash[i] - 128) / 128); // Normalize to [-1, 1]
    }
    
    return embedding;
  }

  /**
   * Retrieve memories by type and paradigm
   */
  getMemoriesByType(memoryType: MemoryType, paradigm: HostParadigm): Memory[] {
    const memories: Memory[] = [];
    const prefix = `${paradigm}:${memoryType}:`;
    
    // Check scratchpad
    for (const [key, memory] of this.scratchpad.entries()) {
      if (key.startsWith(prefix) && Date.now() - memory.timestamp < this.SCRATCHPAD_TTL) {
        memories.push(memory);
      }
    }
    
    // Check memory store
    for (const [key, memory] of this.memoryStore.entries()) {
      if (key.startsWith(prefix) && Date.now() - memory.timestamp < this.MEMORY_TTL) {
        memories.push(memory);
      }
    }
    
    return memories.sort((a, b) => b.timestamp - a.timestamp);
  }
}