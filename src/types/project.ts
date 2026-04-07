export interface Project {
  id: string;
  name: string;
  path: string;
  category: string;
  agents: string[];
  addedAt: string;
}

export interface ProjectsData {
  projects: Project[];
  categories: string[];
}

export interface ProjectAnalysis {
  path: string;
  name: string;
  detectedAgents: string[];
  hasPackageJson: boolean;
  framework?: string;
  language?: string;
}
