import { create } from 'zustand';

interface AgentState {
  currentAgent: string;
  setCurrentAgent: (agent: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  currentAgent: localStorage.getItem('currentAgent') || 'claude',
  setCurrentAgent: (agent) => {
    localStorage.setItem('currentAgent', agent);
    set({ currentAgent: agent });
  },
}));
