import { HostParadigm } from '../../types';

interface Memory {
  content: any;
  timestamp: number;
  paradigm: HostParadigm;
  density: number;
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
    const memory: Memory = {
      content: value,
      timestamp: Date.now(),
      paradigm,
      density
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
}