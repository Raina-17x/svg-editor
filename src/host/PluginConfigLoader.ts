import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PluginInstaller } from './PluginInstaller.js';

interface PluginEntry {
  readonly module: string;
  readonly enabled?: boolean;
  readonly options?: Readonly<Record<string, unknown>>;
}

export class PluginConfigLoader {
  constructor(private readonly installer: PluginInstaller) {}
  async load(configPath: string): Promise<string[]> {
    const absolute = resolve(configPath);
    let entries: PluginEntry[];
    try {
      const config: unknown = JSON.parse(readFileSync(absolute, 'utf8'));
      if (!this.object(config) || !Array.isArray(config.plugins) || !config.plugins.every(entry => this.validEntry(entry))) throw new Error('invalid config');
      entries = config.plugins;
    } catch { return ['error: invalid plugin config']; }
    const diagnostics: string[] = [];
    for (const entry of entries) {
      if (entry.enabled === false) continue;
      diagnostics.push(...await this.loadEntry(entry, absolute));
    }
    return diagnostics;
  }
  private async loadEntry(entry: PluginEntry, configPath: string): Promise<string[]> {
    const requireModule = createRequire(configPath);
    let filename: string;
    try {
      const specifier = entry.module.startsWith('.') || isAbsolute(entry.module)
        ? resolve(dirname(configPath), entry.module) : entry.module;
      filename = requireModule.resolve(specifier);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
        return [`error: plugin not found: ${entry.module}`];
      }
      return this.failed(entry.module, error);
    }
    let name = entry.module;
    try {
      const manifest = this.manifest(filename);
      if (this.object(manifest) && typeof manifest.name === 'string') name = manifest.name;
      let exports: unknown;
      try { exports = requireModule(filename); } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
        if (code !== 'ERR_REQUIRE_ESM' && code !== 'ERR_REQUIRE_ASYNC_MODULE') throw error;
        exports = await import(pathToFileURL(filename).href);
      }
      if ((!exports || (typeof exports !== 'object' && typeof exports !== 'function')) || !Object.hasOwn(exports, 'default')) {
        return [`error: plugin has no default export: ${entry.module}`];
      }
      return this.installer.install(manifest, (exports as { default: unknown }).default, entry.options ?? {});
    } catch (error) { return this.failed(name, error); }
  }
  private manifest(filename: string): unknown {
    let directory = dirname(filename);
    while (true) {
      const file = join(directory, 'package.json');
      if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
      const parent = dirname(directory);
      if (parent === directory) throw new Error('plugin package.json not found');
      directory = parent;
    }
  }
  private object(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  private validEntry(value: unknown): value is PluginEntry {
    return this.object(value) && typeof value.module === 'string' && Boolean(value.module.trim()) &&
      (value.enabled === undefined || typeof value.enabled === 'boolean') &&
      (value.options === undefined || this.object(value.options));
  }
  private failed(name: string, error: unknown): string[] {
    const reason = String(error instanceof Error ? error.message : error).replace(/[\r\n]+/g, ' ');
    return [`error: plugin failed to activate: ${name} (${reason})`];
  }
}
