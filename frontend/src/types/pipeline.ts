export interface SavedPipeline {
  id: string;
  name: string;
  description: string | null;
  nodes: object[];
  edges: object[];
  created_at: string;
  updated_at: string;
}
