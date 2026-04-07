import { useState, useEffect, useCallback } from 'react';

export function useTab(defaultTab = 'overview') {
  const [tab, setTabState] = useState(() => {
    const hash = window.location.hash.slice(1);
    return hash || defaultTab;
  });

  const setTab = useCallback((newTab: string) => {
    setTabState(newTab);
    window.location.hash = newTab;
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) setTabState(hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return { tab, setTab };
}
