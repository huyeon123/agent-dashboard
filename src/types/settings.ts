export interface SettingsData {
  raw: string;
  parsed: Record<string, unknown>;
  format: 'json' | 'toml' | 'jsonc';
  filePath: string;
}
