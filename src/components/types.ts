export class GraphError extends Error {
  constructor(message: string, public readonly component?: string) {
    super(message);
    this.name = 'GraphError';
  }
}
