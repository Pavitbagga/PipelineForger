
import { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { CopilotPanel } from './components/CopilotPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { ShipItModal } from './components/ShipItModal';
import { TestRunOverlay } from './components/TestRunOverlay';
import { DrawingCanvasModal } from './components/DrawingCanvasModal';
import { TutorialModal } from './components/TutorialModal';
import { OnboardingTour, resetTour } from './components/OnboardingTour';
import { usePipelineStore } from './store/pipelineStore';

function App() {
  const { selectedNodeId } = usePipelineStore();
  const [isShipItModalOpen, setIsShipItModalOpen] = useState(false);
  const [isTestRunActive, setIsTestRunActive] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(
    () => localStorage.getItem('forge_tutorial_seen') !== 'true'
  );
  const [showTour, setShowTour] = useState(
    () => localStorage.getItem('forge_onboarded') !== 'true'
  );

  const handleResetTour = () => {
    resetTour();
    setShowTour(true);
  };
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

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
      <Topbar onShipIt={handleShipIt} onTestRun={handleTestRun} onDraw={() => setIsDrawingOpen(true)} onToggleTheme={toggleTheme} theme={theme} onResetTour={handleResetTour} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <ReactFlowProvider>
          <Canvas theme={theme} />
        </ReactFlowProvider>
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

      {/* Drawing Canvas Modal */}
      {isDrawingOpen && <DrawingCanvasModal onClose={() => setIsDrawingOpen(false)} />}

      {/* Tutorial Modal — shown on first visit */}
      {isTutorialOpen && !showTour && (
        <TutorialModal
          onClose={() => {
            localStorage.setItem('forge_tutorial_seen', 'true');
            setIsTutorialOpen(false);
          }}
        />
      )}

      {/* Onboarding Tour — spotlight walkthrough on first load */}
      {showTour && (
        <OnboardingTour onComplete={() => {
          setShowTour(false);
          // Mark tutorial as seen too so it doesn't appear after the tour
          localStorage.setItem('forge_tutorial_seen', 'true');
          setIsTutorialOpen(false);
        }} />
      )}
    </div>
  );
}

export default App;
