import { useState } from 'react';
import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { CopilotPanel } from './components/CopilotPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { ShipItModal } from './components/ShipItModal';
import { TestRunOverlay } from './components/TestRunOverlay';
import { usePipelineStore } from './store/pipelineStore';

function App() {
  const { selectedNodeId } = usePipelineStore();
  const [isShipItModalOpen, setIsShipItModalOpen] = useState(false);
  const [isTestRunActive, setIsTestRunActive] = useState(false);

  const handleShipIt = () => {
    setIsShipItModalOpen(true);
  };

  const handleTestRun = () => {
    setIsTestRunActive(true);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Topbar onShipIt={handleShipIt} onTestRun={handleTestRun} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <Canvas />
        {/* Show ConfigPanel when node is selected, otherwise show CopilotPanel */}
        {selectedNodeId ? <ConfigPanel /> : <CopilotPanel />}
      </div>

      {/* ShipIt Modal */}
      <ShipItModal isOpen={isShipItModalOpen} onClose={() => setIsShipItModalOpen(false)} />

      {/* Test Run Overlay */}
      <TestRunOverlay
        isActive={isTestRunActive}
        onClose={() => setIsTestRunActive(false)}
      />
    </div>
  );
}

export default App;
