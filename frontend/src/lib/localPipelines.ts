/**
 * LocalStorage fallback for pipeline persistence
 * Used when Supabase is not configured or unavailable
 */

const STORAGE_KEY = 'forge_pipelines';

export interface LocalPipeline {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

export const localPipelines = {
  getAll(): LocalPipeline[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('[localPipelines] Failed to read from localStorage:', err);
      return [];
    }
  },

  save(name: string, nodes: unknown[], edges: unknown[]): LocalPipeline {
    try {
      const pipelines = this.getAll();
      const newPipeline: LocalPipeline = {
        id: `local_${Date.now()}`,
        name,
        nodes,
        edges,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      pipelines.push(newPipeline);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
      return newPipeline;
    } catch (err) {
      console.error('[localPipelines] Failed to save to localStorage:', err);
      throw new Error('Failed to save pipeline locally');
    }
  },

  update(id: string, name: string, nodes: unknown[], edges: unknown[]): LocalPipeline | null {
    try {
      const pipelines = this.getAll();
      const index = pipelines.findIndex((p) => p.id === id);
      if (index === -1) return null;

      pipelines[index] = {
        ...pipelines[index],
        name,
        nodes,
        edges,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
      return pipelines[index];
    } catch (err) {
      console.error('[localPipelines] Failed to update localStorage:', err);
      throw new Error('Failed to update pipeline locally');
    }
  },

  delete(id: string): void {
    try {
      const pipelines = this.getAll();
      const filtered = pipelines.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('[localPipelines] Failed to delete from localStorage:', err);
      throw new Error('Failed to delete pipeline locally');
    }
  },
};
