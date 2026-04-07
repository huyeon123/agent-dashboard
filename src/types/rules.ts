export interface RuleFile {
  name: string;
  path: string;
  raw: string;
}

export interface RulesResponse {
  files: RuleFile[];
  dir: string;
  unsupported?: boolean;
}
