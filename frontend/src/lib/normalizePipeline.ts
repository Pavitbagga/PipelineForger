import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../store/pipelineStore';

/**
 * Normalize pipeline data to ensure all required fields exist
 * Prevents crashes from missing or malformed data
 *
 * Use this EVERYWHERE before calling setNodes/setEdges
 */
export function normalizePipeline(data: {
  nodes?: any[];
  edges?: any[];
  copilotMessage?: string;
}): {
  nodes: Node<NodeData>[];
  edges: Edge[];
  copilotMessage: string;
} {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // NORMALIZE NODES
  // ─────────────────────────────────────────────────────────────────────────

  if (Array.isArray(data.nodes)) {
    for (const node of data.nodes) {
      if (!node || typeof node !== 'object') continue;

      // Ensure required fields exist
      const normalizedNode: Node<NodeData> = {
        id: node.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type: node.type || 'output',
        position: {
          x: node.position?.x ?? 100 + Math.random() * 300,
          y: node.position?.y ?? 100 + Math.random() * 200,
        },
        data: {
          label: node.data?.label || node.type || 'Node',
          status: node.data?.status || 'idle',
          // Preserve all existing data fields
          ...(node.data || {}),
        },
      };

      // Ensure data doesn't have undefined values that could break React
      Object.keys(normalizedNode.data).forEach((key) => {
        if (normalizedNode.data[key as keyof NodeData] === undefined) {
          delete normalizedNode.data[key as keyof NodeData];
        }
      });

      nodes.push(normalizedNode);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NORMALIZE EDGES
  // ─────────────────────────────────────────────────────────────────────────

  if (Array.isArray(data.edges)) {
    for (const edge of data.edges) {
      if (!edge || typeof edge !== 'object') continue;

      // Ensure required fields exist
      const normalizedEdge: Edge = {
        id: edge.id || `e${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      };

      // Only add if source and target are valid
      if (normalizedEdge.source && normalizedEdge.target) {
        // Verify source and target nodes exist
        const sourceExists = nodes.some((n) => n.id === normalizedEdge.source);
        const targetExists = nodes.some((n) => n.id === normalizedEdge.target);

        if (sourceExists && targetExists) {
          edges.push(normalizedEdge);
        } else {
          console.warn(
            `[normalizePipeline] Skipping edge ${normalizedEdge.id}: source or target node not found`
          );
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NORMALIZE MESSAGE
  // ─────────────────────────────────────────────────────────────────────────

  const copilotMessage =
    data.copilotMessage || 'Pipeline loaded successfully. Click any node to configure it.';

  return {
    nodes,
    edges,
    copilotMessage,
  };
}

/**
 * Validate that a position object is valid
 */
export function validatePosition(position: any): { x: number; y: number } {
  if (
    position &&
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    isFinite(position.x) &&
    isFinite(position.y)
  ) {
    return position;
  }

  // Fallback position
  return {
    x: 300 + Math.random() * 200,
    y: 250 + Math.random() * 100,
  };
}
