import fs from 'fs';
import path from 'path';
import type {
  AgentConfig,
  AgentPaths,
  InstructionsData,
  SkillInfo,
  AgentSupports,
  InstructionFileStatus,
  RulesCountResult,
  RuleFileInfo,
  RulesListResult,
} from './types';
import { resolveHome, getSupports } from './types';
import { parseMarkdownSections, parseYamlFrontmatter } from '../parsers';
import { safeReadFile, ensureDir, backupFile } from '../backup';

export class AgentAdapter {
  readonly config: AgentConfig;
  constructor(config: AgentConfig) { this.config = config; }

  get paths(): AgentPaths {
    return this.config.paths;
  }

  get supports(): AgentSupports {
    return getSupports(this.paths);
  }

  get globalHome(): string {
    return resolveHome(this.paths.globalHome);
  }

  // --- Instructions ---
  getGlobalInstructions(): InstructionsData {
    const filePath = resolveHome(this.paths.globalInstruction);
    const raw = safeReadFile(filePath);
    return {
      raw,
      sections: parseMarkdownSections(raw),
      filePath,
    };
  }

  setGlobalInstructions(raw: string): void {
    const filePath = resolveHome(this.paths.globalInstruction);
    ensureDir(path.dirname(filePath));
    backupFile(filePath);
    fs.writeFileSync(filePath, raw, 'utf-8');
  }

  getProjectInstructions(projectPath: string): InstructionsData {
    const filePath = path.join(projectPath, this.paths.projectInstruction);
    const raw = safeReadFile(filePath);
    return {
      raw,
      sections: parseMarkdownSections(raw),
      filePath,
    };
  }

  setProjectInstructions(projectPath: string, raw: string): void {
    const filePath = path.join(projectPath, this.paths.projectInstruction);
    ensureDir(path.dirname(filePath));
    backupFile(filePath);
    fs.writeFileSync(filePath, raw, 'utf-8');
  }

  deleteProjectInstructions(projectPath: string): boolean {
    const filePath = path.join(projectPath, this.paths.projectInstruction);
    if (fs.existsSync(filePath)) {
      backupFile(filePath);
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  // --- Instruction file existence checks ---
  checkGlobalInstructionFiles(): { files: InstructionFileStatus[] } {
    const files = this.paths.instructionFiles?.global ?? [];
    return {
      files: files.map((filePath) => {
        const resolved = resolveHome(filePath);
        return {
          name: path.basename(resolved),
          path: resolved,
          exists: fs.existsSync(resolved),
        };
      }),
    };
  }

  checkProjectInstructionFiles(projectPath: string): { files: InstructionFileStatus[] } {
    const files = this.paths.instructionFiles?.project ?? [];
    return {
      files: files.map((filePath) => {
        const resolved = path.join(projectPath, filePath);
        return {
          name: filePath,
          path: resolved,
          exists: fs.existsSync(resolved),
        };
      }),
    };
  }

  // --- Rules directory count ---
  getGlobalRulesCount(): RulesCountResult {
    const dir = this.paths.rulesDir?.global;
    if (!dir) return { count: 0, dir: '' };
    const resolved = resolveHome(dir);
    return { count: this.countMdFiles(resolved), dir: resolved };
  }

  getProjectRulesCount(projectPath: string): RulesCountResult {
    const dir = this.paths.rulesDir?.project;
    if (!dir) return { count: 0, dir: '' };
    const resolved = path.join(projectPath, dir);
    return { count: this.countMdFiles(resolved), dir: resolved };
  }

  getGlobalRules(): RulesListResult {
    const dir = this.paths.rulesDir?.global;
    if (!dir) return { files: [], dir: '', unsupported: true };
    const resolved = resolveHome(dir);
    return { files: this.readMdFiles(resolved), dir: resolved };
  }

  getProjectRules(projectPath: string): RulesListResult {
    const dir = this.paths.rulesDir?.project;
    if (!dir) return { files: [], dir: '', unsupported: true };
    const resolved = path.join(projectPath, dir);
    return { files: this.readMdFiles(resolved), dir: resolved };
  }

  private countMdFiles(dir: string): number {
    if (!fs.existsSync(dir)) return 0;
    try {
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.md'))
        .length;
    } catch {
      return 0;
    }
  }

  private readMdFiles(dir: string): RuleFileInfo[] {
    if (!fs.existsSync(dir)) return [];

    try {
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => {
          const filePath = path.join(dir, entry.name);
          return {
            name: entry.name,
            path: filePath,
            raw: safeReadFile(filePath),
          };
        });
    } catch {
      return [];
    }
  }

  // --- Settings ---
  getSettings(): { raw: string; parsed: Record<string, unknown>; format: string; filePath: string } | null {
    if (!this.paths.settings) return null;
    const filePath = path.join(this.globalHome, this.paths.settings);
    const raw = safeReadFile(filePath);
    if (!raw) return { raw: '', parsed: {}, format: this.paths.settingsFormat || 'json', filePath };

    let parsed: Record<string, unknown> = {};
    try {
      if (this.paths.settingsFormat === 'toml') {
        // Basic TOML parsing - just return raw for now, frontend can parse
        parsed = { _raw: raw };
      } else {
        // JSON or JSONC
        const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        parsed = JSON.parse(cleaned);
      }
    } catch {
      parsed = { _parseError: true };
    }

    return { raw, parsed, format: this.paths.settingsFormat || 'json', filePath };
  }

  setSettings(raw: string): void {
    if (!this.paths.settings) return;
    const filePath = path.join(this.globalHome, this.paths.settings);
    ensureDir(path.dirname(filePath));
    backupFile(filePath);
    fs.writeFileSync(filePath, raw, 'utf-8');
  }

  // --- Skills ---
  getSkills(): SkillInfo[] {
    if (!this.paths.skills) return [];
    const skills: SkillInfo[] = [];

    // Global skills
    const globalSkillsDir = path.join(this.globalHome, this.paths.skills);
    if (fs.existsSync(globalSkillsDir)) {
      this.scanSkillsDir(globalSkillsDir, 'user', skills);
    }

    return skills;
  }

  private scanSkillsDir(dir: string, source: 'user' | 'plugin' | 'project', skills: SkillInfo[], projectName?: string): void {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = path.join(dir, entry.name);
        const skillFile = path.join(skillDir, 'SKILL.md');

        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, 'utf-8');
          const { frontmatter, body } = parseYamlFrontmatter(content);

          skills.push({
            id: `${source}:${entry.name}`,
            name: (frontmatter.name as string) || entry.name,
            description: (frontmatter.description as string) || '',
            path: skillFile,
            source,
            content: body.trim().slice(0, 800),
            projectName,
          });
        }
      }
    } catch {
      // Permission error or similar
    }
  }

  createSkill(name: string, description: string, content: string, scope: 'global' | 'project', projectPath?: string): void {
    if (!this.paths.skills) return;

    const baseDir = scope === 'global'
      ? path.join(this.globalHome, this.paths.skills)
      : path.join(projectPath || '', this.config.paths.projectDir, this.paths.skills);

    const skillDir = path.join(baseDir, name);
    ensureDir(skillDir);

    const skillContent = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent, 'utf-8');
  }

  deleteSkill(skillPath: string): boolean {
    if (fs.existsSync(skillPath)) {
      const dir = path.dirname(skillPath);
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  }

  // --- Agent Definitions ---
  getAgentDefs(): Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }> {
    if (!this.paths.agents) return [];
    const defs: Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }> = [];

    const globalAgentsDir = path.join(this.globalHome, this.paths.agents);
    if (fs.existsSync(globalAgentsDir)) {
      this.scanAgentsDir(globalAgentsDir, 'global', defs);
    }

    return defs;
  }

  private scanAgentsDir(dir: string, scope: string, defs: Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }>): void {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

        const filePath = path.join(dir, entry.name);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, body } = parseYamlFrontmatter(raw);

        const tools = Array.isArray(frontmatter.tools)
          ? (frontmatter.tools as string[])
          : typeof frontmatter.tools === 'string'
            ? [frontmatter.tools as string]
            : [];

        defs.push({
          id: `${scope}:${entry.name.replace('.md', '')}`,
          name: (frontmatter.name as string) || entry.name.replace('.md', ''),
          description: (frontmatter.description as string) || body.trim().slice(0, 200),
          model: (frontmatter.model as string) || 'unknown',
          tools,
          path: filePath,
          scope,
          raw,
        });
      }
    } catch {
      // Permission error
    }
  }

  // --- Hooks (primarily for Claude) ---
  getHooks(): { hooks: Array<{ event: string; matcher: string; type: string; command: string; timeout?: number; index: number }>; permissions: { allow: string[]; deny: string[] }; disableAllHooks: boolean } | null {
    if (!this.paths.hooks) return null;

    // hooks path is like "settings.json#hooks"
    const [file, key] = this.paths.hooks.split('#');
    const filePath = path.join(this.globalHome, file);
    const raw = safeReadFile(filePath);
    if (!raw) return { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false };

    try {
      const settings = JSON.parse(raw);
      const hooksConfig = key ? settings[key] : settings;
      const flatHooks: Array<{ event: string; matcher: string; type: string; command: string; timeout?: number; index: number }> = [];

      if (hooksConfig && typeof hooksConfig === 'object') {
        for (const [event, matchers] of Object.entries(hooksConfig)) {
          if (!Array.isArray(matchers)) continue;
          for (const matcherObj of matchers) {
            const matcher = (matcherObj as Record<string, unknown>).matcher as string || '*';
            const hooks = (matcherObj as Record<string, unknown>).hooks as Array<Record<string, unknown>> || [];
            for (let i = 0; i < hooks.length; i++) {
              const h = hooks[i];
              flatHooks.push({
                event,
                matcher,
                type: (h.type as string) || 'command',
                command: (h.command as string) || (h.url as string) || (h.prompt as string) || '',
                timeout: h.timeout as number | undefined,
                index: i,
              });
            }
          }
        }
      }

      const permissions = settings.permissions || {};
      return {
        hooks: flatHooks,
        permissions: {
          allow: Array.isArray(permissions.allow) ? permissions.allow : [],
          deny: Array.isArray(permissions.deny) ? permissions.deny : [],
        },
        disableAllHooks: !!settings.disableAllHooks,
      };
    } catch {
      return { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false };
    }
  }

  // --- MCP Servers ---
  getMcpServers(): Array<{ name: string; command: string; args: string[] }> {
    if (!this.paths.mcp || this.paths.mcp.length === 0) return [];
    const servers: Array<{ name: string; command: string; args: string[] }> = [];

    for (const mcpPath of this.paths.mcp) {
      const [file, key] = mcpPath.split('#');

      // Try global home first
      const filePath = file.startsWith('.')
        ? path.join(this.globalHome, '..', file)  // .mcp.json is at project root level
        : path.join(this.globalHome, file);

      const raw = safeReadFile(filePath);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw.replace(/\/\/.*$/gm, ''));
        const mcpConfig = key ? (parsed as Record<string, unknown>)[key] : parsed;

        if (mcpConfig && typeof mcpConfig === 'object') {
          for (const [name, config] of Object.entries(mcpConfig as Record<string, unknown>)) {
            const c = config as Record<string, unknown>;
            servers.push({
              name,
              command: (c.command as string) || '',
              args: Array.isArray(c.args) ? (c.args as string[]) : [],
            });
          }
        }
      } catch {
        // parse error
      }
    }

    return servers;
  }

  // --- Project-Level Settings ---
  getProjectSettings(projectPath: string): { raw: string; parsed: Record<string, unknown>; format: string; filePath: string } | null {
    if (!this.paths.settings) return null;
    const projectHome = path.join(projectPath, this.paths.projectDir);
    const filePath = path.join(projectHome, this.paths.settings);
    const raw = safeReadFile(filePath);
    if (!raw) return { raw: '', parsed: {}, format: this.paths.settingsFormat || 'json', filePath };

    let parsed: Record<string, unknown> = {};
    try {
      if (this.paths.settingsFormat === 'toml') {
        parsed = { _raw: raw };
      } else {
        const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        parsed = JSON.parse(cleaned);
      }
    } catch {
      parsed = { _parseError: true };
    }

    return { raw, parsed, format: this.paths.settingsFormat || 'json', filePath };
  }

  // --- Project-Level Skills ---
  getProjectSkills(projectPath: string): SkillInfo[] {
    if (!this.paths.skills) return [];
    const skills: SkillInfo[] = [];
    const projectSkillsDir = path.join(projectPath, this.paths.projectDir, this.paths.skills);
    if (fs.existsSync(projectSkillsDir)) {
      this.scanSkillsDir(projectSkillsDir, 'project', skills);
    }
    return skills;
  }

  // --- Project-Level Hooks ---
  getProjectHooks(projectPath: string): { hooks: Array<{ event: string; matcher: string; type: string; command: string; timeout?: number; index: number }>; permissions: { allow: string[]; deny: string[] }; disableAllHooks: boolean } | null {
    if (!this.paths.hooks) return null;

    const [file, key] = this.paths.hooks.split('#');
    const projectHome = path.join(projectPath, this.paths.projectDir);
    const filePath = path.join(projectHome, file);
    const raw = safeReadFile(filePath);
    if (!raw) return { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false };

    try {
      const settings = JSON.parse(raw);
      const hooksConfig = key ? settings[key] : settings;
      const flatHooks: Array<{ event: string; matcher: string; type: string; command: string; timeout?: number; index: number }> = [];

      if (hooksConfig && typeof hooksConfig === 'object') {
        for (const [event, matchers] of Object.entries(hooksConfig)) {
          if (!Array.isArray(matchers)) continue;
          for (const matcherObj of matchers) {
            const matcher = (matcherObj as Record<string, unknown>).matcher as string || '*';
            const hooks = (matcherObj as Record<string, unknown>).hooks as Array<Record<string, unknown>> || [];
            for (let i = 0; i < hooks.length; i++) {
              const h = hooks[i];
              flatHooks.push({
                event,
                matcher,
                type: (h.type as string) || 'command',
                command: (h.command as string) || (h.url as string) || (h.prompt as string) || '',
                timeout: h.timeout as number | undefined,
                index: i,
              });
            }
          }
        }
      }

      const permissions = settings.permissions || {};
      return {
        hooks: flatHooks,
        permissions: {
          allow: Array.isArray(permissions.allow) ? permissions.allow : [],
          deny: Array.isArray(permissions.deny) ? permissions.deny : [],
        },
        disableAllHooks: !!settings.disableAllHooks,
      };
    } catch {
      return { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false };
    }
  }

  // --- Project-Level MCP Servers ---
  getProjectMcpServers(projectPath: string): Array<{ name: string; command: string; args: string[] }> {
    if (!this.paths.mcp || this.paths.mcp.length === 0) return [];
    const servers: Array<{ name: string; command: string; args: string[] }> = [];
    const projectHome = path.join(projectPath, this.paths.projectDir);

    for (const mcpPath of this.paths.mcp) {
      const [file, key] = mcpPath.split('#');

      const filePath = file.startsWith('.')
        ? path.join(projectPath, file)
        : path.join(projectHome, file);

      const raw = safeReadFile(filePath);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw.replace(/\/\/.*$/gm, ''));
        const mcpConfig = key ? (parsed as Record<string, unknown>)[key] : parsed;

        if (mcpConfig && typeof mcpConfig === 'object') {
          for (const [name, config] of Object.entries(mcpConfig as Record<string, unknown>)) {
            const c = config as Record<string, unknown>;
            servers.push({
              name,
              command: (c.command as string) || '',
              args: Array.isArray(c.args) ? (c.args as string[]) : [],
            });
          }
        }
      } catch {
        // parse error
      }
    }

    return servers;
  }

  // --- Project-Level Agent Definitions ---
  getProjectAgentDefs(projectPath: string): Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }> {
    if (!this.paths.agents) return [];
    const defs: Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }> = [];

    const projectAgentsDir = path.join(projectPath, this.paths.projectDir, this.paths.agents);
    if (fs.existsSync(projectAgentsDir)) {
      this.scanAgentsDir(projectAgentsDir, 'project', defs);
    }

    return defs;
  }

  // --- Plugins ---
  getPlugins(): Array<{ name: string; version: string; scope: string; enabled: boolean; path: string }> {
    if (!this.paths.plugins) return [];

    const pluginsDir = path.join(this.globalHome, this.paths.plugins);
    const registryPath = path.join(pluginsDir, 'installed_plugins.json');

    if (!fs.existsSync(registryPath)) return [];

    const mapScope = (s: string): string => {
      if (s === 'user') return 'global';
      if (s === 'local') return 'project';
      return s;
    };

    try {
      const raw = fs.readFileSync(registryPath, 'utf-8');
      const data = JSON.parse(raw);

      // v2 format: { version: 2, plugins: { "name@marketplace": [...] } }
      if (data && data.version === 2 && data.plugins && typeof data.plugins === 'object' && !Array.isArray(data.plugins)) {
        const results: Array<{ name: string; version: string; scope: string; enabled: boolean; path: string }> = [];
        for (const [key, entries] of Object.entries(data.plugins)) {
          const pluginName = key.split('@')[0] || key;
          if (!Array.isArray(entries)) continue;
          for (const entry of entries) {
            const e = entry as Record<string, unknown>;
            results.push({
              name: pluginName,
              version: (e.version as string) || '0.0.0',
              scope: mapScope((e.scope as string) || 'user'),
              enabled: true,
              path: (e.installPath as string) || pluginsDir,
            });
          }
        }
        return results;
      }

      // v1 format: plain array
      if (Array.isArray(data)) {
        return data.map((p: Record<string, unknown>) => ({
          name: (p.name as string) || 'unknown',
          version: (p.version as string) || '0.0.0',
          scope: (p.scope as string) || 'user',
          enabled: p.enabled !== false,
          path: (p.path as string) || pluginsDir,
        }));
      }
    } catch {
      // parse error
    }

    return [];
  }

  getProjectPlugins(projectPath: string): Array<{ name: string; version: string; scope: string; enabled: boolean; path: string }> {
    return this.getPlugins().filter((p) => p.scope === 'project' && p.path.startsWith(projectPath));
  }
}
