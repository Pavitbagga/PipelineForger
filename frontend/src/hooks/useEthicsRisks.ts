import { useEffect, useState } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { apiClient } from '../lib/apiClient';
import type { EthicsRisk } from '../lib/mocks/demoData';

/**
 * Hook to fetch and manage ethics risks for the current pipeline
 * Only active when VITE_DEMO_MODE is enabled
 */
export function useEthicsRisks() {
  const { nodes } = usePipelineStore();
  const [risks, setRisks] = useState<Map<string, EthicsRisk>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
    if (!DEMO_MODE || nodes.length === 0) {
      setRisks(new Map());
      return;
    }

    // Debounce: Wait for pipeline to stabilize before scanning
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.getEthicsRisks(nodes);
        const riskMap = new Map<string, EthicsRisk>();
        response.risks.forEach((risk: EthicsRisk) => {
          riskMap.set(risk.nodeId, risk);
        });
        setRisks(riskMap);
      } catch (error) {
        console.error('[useEthicsRisks] Failed to fetch ethics risks:', error);
        setRisks(new Map());
      } finally {
        setLoading(false);
      }
    }, 1000); // Wait 1s after pipeline changes

    return () => clearTimeout(timeoutId);
  }, [nodes]);

  return {
    risks,
    loading,
    getRiskForNode: (nodeId: string) => risks.get(nodeId) ?? null,
  };
}
