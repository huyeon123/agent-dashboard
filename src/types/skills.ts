export type SkillSource = 'user' | 'plugin' | 'project';

export interface Skill {
  id: string;
  name: string;
  description: string;
  path: string;
  source: SkillSource;
  content: string;
  projectName?: string;
}

export interface CreateSkillInput {
  name: string;
  description: string;
  content: string;
  scope: 'global' | 'project';
  projectPath?: string;
}
