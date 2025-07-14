/* Browser stub: always reports "not available". Only the methods that are
   referenced from the client-side code are included. */

import type { EffortType, Citation } from '../types';

export class AzureOpenAIService {
  static isAvailable(): boolean {
    return false;
  }

  // keep the signature but never used in the stub
  static getInstance(): AzureOpenAIService {
    throw new Error('AzureOpenAIService is not available in the browser.');
  }

  // dummy match for getConfig() references in type-only positions
  /* eslint-disable @typescript-eslint/no-empty-function */
  private constructor() {}
  /* eslint-enable */
}

/* Type helpers so that existing `import type { AzureOpenAIResponse }` keeps working. */
export type AzureOpenAIResponse = {
  text: string;
  sources?: Citation[];
};
