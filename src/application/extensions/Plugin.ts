import { PluginContext } from './PluginContext.js';

export interface PluginManifest {
  readonly name: string;
  readonly contributes?: {
    readonly shapes?: readonly string[];
    readonly commands?: readonly string[];
    readonly decorators?: readonly string[];
    readonly attributes?: readonly string[];
  };
}

/** Default-exported class instance; activation registers but performs no IO edits. */
export interface Plugin {
  activate(context: PluginContext, options: Readonly<Record<string, unknown>>): void;
}
