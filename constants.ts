import { EffortType, ModelType, GENAI_MODEL_FLASH } from "./types";

// Removed GENAI_MODEL_FLASH, GENAI_MODEL_PRO, GENAI_MODEL_IMAGEN definitions.
// GENAI_MODEL_FLASH is now imported from types.ts.
// GENAI_MODEL_PRO was prohibited.
// GENAI_MODEL_IMAGEN was unused in this context.

export const DEFAULT_EFFORT: EffortType = EffortType.MEDIUM;
export const DEFAULT_MODEL: ModelType = GENAI_MODEL_FLASH;