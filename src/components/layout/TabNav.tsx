import { useI18n } from '../../i18n';

const TAB_KEYS = [
  'overview',
  'instructions',
  'skills',
  'connectors',
  'hooks',
  'permissions',
  'agentsDef',
  'plugins',
  'monitor',
  'capabilities',
] as const;

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const { t } = useI18n();

  return (
    <nav className="flex items-center gap-1 px-6 py-2 border-b border-border bg-bg-secondary overflow-x-auto">
      {TAB_KEYS.map((key) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
            activeTab === key
              ? 'bg-accent-purple text-white font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
        >
          {t(`tabs.${key}`)}
        </button>
      ))}
    </nav>
  );
}
