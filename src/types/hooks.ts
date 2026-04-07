export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'Stop'
  | 'Notification'
  | 'UserPromptSubmit'
  | 'PreCompact'
  | 'PostCompact'
  | 'PermissionRequest';

export type HookHandlerType = 'command' | 'http' | 'prompt' | 'agent';

export interface HookEntry {
  type: HookHandlerType;
  command?: string;
  url?: string;
  prompt?: string;
  timeout?: number;
}

export interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

export interface FlattenedHook {
  event: HookEvent;
  matcher: string;
  type: HookHandlerType;
  command: string;
  timeout?: number;
  index: number;
}

export interface HooksData {
  hooks: FlattenedHook[];
  permissions: {
    allow: string[];
    deny: string[];
  };
  disableAllHooks: boolean;
}
