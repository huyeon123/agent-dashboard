import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';
import type { InstructionsData } from '../../types/instructions';

const MARKDOWN_PROSE_CLASSES = `prose prose-invert prose-sm max-w-none bg-bg-tertiary border border-border rounded-lg px-6 py-5 overflow-y-auto max-h-[calc(100vh-220px)]
  [&_h1]:text-text-primary [&_h1]:text-lg [&_h1]:font-bold [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2 [&_h1]:mb-4
  [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
  [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
  [&_h4]:text-text-secondary [&_h4]:text-sm [&_h4]:font-medium
  [&_p]:text-text-secondary [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-3
  [&_ul]:text-text-secondary [&_ul]:text-sm [&_ul]:space-y-1
  [&_ol]:text-text-secondary [&_ol]:text-sm [&_ol]:space-y-1
  [&_li]:text-text-secondary
  [&_a]:text-accent-purple [&_a]:no-underline hover:[&_a]:underline
  [&_code]:text-accent-purple [&_code]:bg-bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
  [&_pre]:bg-bg-secondary [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border
  [&_pre_code]:bg-transparent [&_pre_code]:p-0
  [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse
  [&_th]:text-left [&_th]:text-text-primary [&_th]:bg-bg-secondary [&_th]:px-3 [&_th]:py-2 [&_th]:border [&_th]:border-border [&_th]:text-xs [&_th]:font-medium
  [&_td]:text-text-secondary [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border [&_td]:text-xs
  [&_blockquote]:border-l-2 [&_blockquote]:border-accent-purple [&_blockquote]:pl-4 [&_blockquote]:text-text-muted [&_blockquote]:italic
  [&_hr]:border-border [&_hr]:my-6
  [&_strong]:text-text-primary [&_strong]:font-semibold`;

function InstructionEditor({
  apiUrl,
  t,
}: {
  apiUrl: string;
  t: (k: string) => string;
}) {
  const { data, loading, error, reload } = useFetch<InstructionsData>(apiUrl);
  const addToast = useToast((s) => s.addToast);

  const [rawMode, setRawMode] = useState(false);
  const [rawText, setRawText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setRawText(data.raw ?? '');
    }
  }, [data]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: rawText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('instructions.saved'), 'success');
      reload();
    } catch (err) {
      addToast(String(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-bg-tertiary rounded-lg border border-border" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-accent-red text-sm">
        {t('common.error')}: {error}
      </div>
    );
  }

  if (!data || !data.raw) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-text-muted text-sm">{t('instructions.noInstructions')}</p>
        <button
          className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity"
          onClick={async () => {
            await fetch(apiUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ raw: '# Instructions\n- Add your rules here' }),
            });
            reload();
          }}
        >
          {t('common.create')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-sm">{data.filePath}</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={rawMode}
              onChange={(e) => setRawMode(e.target.checked)}
              className="accent-accent-purple"
            />
            Raw
          </label>
          <button
            className="px-4 py-1.5 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '...' : t('common.save')}
          </button>
        </div>
      </div>

      {rawMode ? (
        <textarea
          className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 font-mono text-xs text-text-primary focus:outline-none focus:border-border-hover min-h-64 resize-y"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
      ) : (
        <div className={MARKDOWN_PROSE_CLASSES}>
          <Markdown remarkPlugins={[remarkGfm]}>{rawText}</Markdown>
        </div>
      )}
    </div>
  );
}

function GlobalTab({ agent, t }: { agent: string; t: (k: string) => string }) {
  return (
    <InstructionEditor
      apiUrl={`/api/instructions?agent=${agent}`}
      t={t}
    />
  );
}

function ProjectTab({ agent, t }: { agent: string; t: (k: string) => string }) {
  const { projectPath, projects } = useScope();

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-text-muted text-sm">{t('instructions.registerProjects')}</p>
      </div>
    );
  }

  const selectedPath = projectPath ?? (projects.length > 0 ? projects[0].path : null);

  const apiUrl = selectedPath
    ? `/api/instructions/project?agent=${agent}&path=${encodeURIComponent(selectedPath)}`
    : null;

  return (
    <div className="space-y-4">
      {apiUrl && (
        <InstructionEditor apiUrl={apiUrl} t={t} />
      )}
    </div>
  );
}

export function InstructionsPanel() {
  const { t } = useI18n();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const projectOnly = useUiStore((s) => s.projectOnly);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">{t('instructions.globalTitle')}</h2>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple font-medium border border-accent-purple/20">
              {t('common.global')}
            </span>
          </div>
          <GlobalTab agent={currentAgent} t={t} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green font-medium border border-accent-green/20">
            {t('common.project')}
          </span>
        </div>
        <ProjectTab agent={currentAgent} t={t} />
      </section>
    </div>
  );
}
