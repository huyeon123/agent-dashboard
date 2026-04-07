export interface Plugin {
  name: string;
  version: string;
  scope: string;
  enabled: boolean;
  path: string;
  installedAt?: string;
  updatedAt?: string;
}
