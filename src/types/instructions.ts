export interface Section {
  title: string;
  content: string[];
}

export interface InstructionsData {
  raw: string;
  sections: Section[];
  filePath: string;
}
