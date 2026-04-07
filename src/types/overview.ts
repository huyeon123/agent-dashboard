export interface InstructionFileStatus {
  name: string;
  path: string;
  exists: boolean;
}

export interface InstructionFilesCheckResult {
  files: InstructionFileStatus[];
}

export interface RulesCountResult {
  count: number;
  dir: string;
}
