export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  default: string | undefined;
  description: string;
  deprecated?: string | boolean;
  since?: string;
  example?: string;
  see?: string;
}

export interface EmitDoc {
  name: string;
  description: string;
  payload?: string;
}

export interface SlotDoc {
  name: string;
  description: string;
  bindings: string[];
}

export interface ExposeDoc {
  name: string;
  type: string;
  description: string;
}

export interface ComposableVariable {
  name: string;
  type?: string;
}

export interface ComposableDoc {
  name: string;
  source?: string;
  variables: ComposableVariable[];
}

export interface RefDoc {
  name: string;
  type: string;
  description: string;
  deprecated?: string | boolean;
  since?: string;
  example?: string;
  see?: string;
}

export interface ComputedDoc {
  name: string;
  type: string;
  description: string;
  deprecated?: string | boolean;
  since?: string;
  example?: string;
  see?: string;
}

export interface ComponentDoc {
  name: string;
  description?: string;
  internal?: boolean;
  scriptSetup?: boolean;
  props: PropDoc[];
  emits: EmitDoc[];
  slots?: SlotDoc[];
  exposes?: ExposeDoc[];
  composables?: ComposableDoc[];
  refs?: RefDoc[];
  computeds?: ComputedDoc[];
}

export type OutputFormat = "md" | "json";

export interface RunSummary {
  documented: number;
  skipped: number;
  errors: number;
  files: Array<{ path: string; doc: ComponentDoc }>;
  errorDetails: Array<{ path: string; error: string }>;
}

export interface DiscoveryResult {
  files: string[];
  ignoredCount: number;
  basePath: string;
}
