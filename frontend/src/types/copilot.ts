/**
 * Type definitions for Forge Copilot actions
 */

export interface CopilotAction {
  type: 'addNode' | 'addEdge' | 'updateNode' | 'deleteNode' | 'deleteEdge';
}

export interface AddNodeAction extends CopilotAction {
  type: 'addNode';
  nodeType: 'input' | 'llm' | 'tool' | 'agent' | 'router' | 'output';
  position?: { x: number; y: number };
  config?: Record<string, any>;
}

export interface AddEdgeAction extends CopilotAction {
  type: 'addEdge';
  source: string;
  target: string;
}

export interface UpdateNodeAction extends CopilotAction {
  type: 'updateNode';
  nodeId: string;
  updates: {
    data?: Record<string, any>;
    position?: { x: number; y: number };
  };
}

export interface DeleteNodeAction extends CopilotAction {
  type: 'deleteNode';
  nodeId: string;
}

export interface DeleteEdgeAction extends CopilotAction {
  type: 'deleteEdge';
  edgeId: string;
}

export type CopilotActionType =
  | AddNodeAction
  | AddEdgeAction
  | UpdateNodeAction
  | DeleteNodeAction
  | DeleteEdgeAction;

export interface CopilotResponse {
  response: string;
  actions?: CopilotActionType[];
}
