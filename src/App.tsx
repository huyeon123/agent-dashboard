import { Shell } from './components/layout/Shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ui/ToastContainer';
import { useTab } from './hooks/use-tab';
import { useToast } from './hooks/use-toast';

import { OverviewPanel } from './features/overview/OverviewPanel';
import { InstructionsPanel } from './features/instructions/InstructionsPanel';
import { RulesPanel } from './features/rules/RulesPanel';
import { SkillsPanel } from './features/skills/SkillsPanel';
import { ConnectorsPanel } from './features/connectors/ConnectorsPanel';
import { HooksPanel } from './features/hooks/HooksPanel';
import { PermissionsPanel } from './features/permissions/PermissionsPanel';
import { AgentsDefPanel } from './features/agents-def/AgentsDefPanel';
import { PluginsPanel } from './features/plugins/PluginsPanel';
import { MonitorPanel } from './features/monitor/MonitorPanel';
import { SettingsPanel } from './features/settings/SettingsPanel';
function App() {
  const { tab, setTab } = useTab('overview');
  const toasts = useToast((s) => s.toasts);
  const removeToast = useToast((s) => s.removeToast);

  const renderPanel = () => {
    switch (tab) {
      case 'overview': return <OverviewPanel />;
      case 'instructions': return <InstructionsPanel />;
      case 'rules': return <RulesPanel />;
      case 'skills': return <SkillsPanel />;
      case 'connectors': return <ConnectorsPanel />;
      case 'hooks': return <HooksPanel />;
      case 'permissions': return <PermissionsPanel />;
      case 'agentsDef': return <AgentsDefPanel />;
      case 'plugins': return <PluginsPanel />;
      case 'monitor': return <MonitorPanel />;
      case 'settings': return <SettingsPanel />;
      default: return <OverviewPanel />;
    }
  };

  return (
    <ErrorBoundary>
      <Shell activeTab={tab} onTabChange={setTab}>
        <ErrorBoundary key={tab}>
          <div className="tab-content">
            {renderPanel()}
          </div>
        </ErrorBoundary>
      </Shell>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ErrorBoundary>
  );
}

export default App;
