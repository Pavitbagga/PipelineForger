import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
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
import { SavedPipelinesPanel } from './components/SavedPipelinesPanel';
import { ExecutionHistoryPanel } from './components/ExecutionHistoryPanel';
import { OnboardingTour, resetTour } from './components/OnboardingTour';
import { LoginPage } from './components/LoginPage';
import { supabase } from './lib/supabase';
import { usePipelineStore } from './store/pipelineStore';

function App() {
  const { selectedNodeId } = usePipelineStore();

  // ── Auth state ──────────────────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── UI state ────────────────────────────────────────────────────────────
  const [isShipItModalOpen, setIsShipItModalOpen] = useState(false);
  const [isTestRunActive, setIsTestRunActive] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isPipelinesOpen, setIsPipelinesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  );

  // ── Theme sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── Auth bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s) await handlePostLogin(s);
      setAuthLoading(false);
    });

    // 2. Subscribe to auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        if (s && !authLoading) {
          // Token refresh — don't re-run first-login logic
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── First-login detection from DB ───────────────────────────────────────
  const handlePostLogin = async (s: Session) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_first_login')
        .eq('id', s.user.id)
        .single();

      if (error) {
        console.error('[App] Failed to fetch profile:', error.message);
        return;
      }

      if (profile?.is_first_login) {
        // Show tour and immediately flip the flag so it never repeats
        setShowTour(true);
        await supabase
          .from('profiles')
          .update({ is_first_login: false })
          .eq('id', s.user.id);
      } else {
        // Not first login — respect localStorage for tutorial doc panel
        setIsTutorialOpen(localStorage.getItem('forge_tutorial_seen') !== 'true');
      }
    } catch (err) {
      console.error('[App] handlePostLogin error:', err);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const handleShipIt = () => setIsShipItModalOpen(true);
  const handleTestRun = () => setIsTestRunActive(true);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[App] Sign-out error:', error.message);
    // session will become null via onAuthStateChange
  };

  const handleResetTour = () => {
    resetTour();
    setShowTour(true);
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(99,102,241,0.3)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Login gate ────────────────────────────────────────────────────────────
  if (!session) {
    return <LoginPage />;
  }

  // ── Authenticated app ─────────────────────────────────────────────────────
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
      <Topbar
        onShipIt={handleShipIt}
        onTestRun={handleTestRun}
        onDraw={() => setIsDrawingOpen(true)}
        onToggleTheme={toggleTheme}
        theme={theme}
        onResetTour={handleResetTour}
        session={session}
        onSignOut={handleSignOut}
        onOpenPipelines={() => setIsPipelinesOpen(true)}
        onPipelineSaved={() => setRefreshTrigger((n) => n + 1)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div className="fade-in-stagger-1">
          <Sidebar />
        </div>
        <div className="fade-in-stagger-2" style={{ flex: 1, display: 'flex' }}>
          <ReactFlowProvider>
            <Canvas theme={theme} />
          </ReactFlowProvider>
        </div>
        <div className="fade-in-stagger-3">
          {selectedNodeId ? <ConfigPanel /> : <CopilotPanel />}
        </div>
      </div>

      {isPipelinesOpen && (
        <SavedPipelinesPanel
          onClose={() => setIsPipelinesOpen(false)}
          refreshTrigger={refreshTrigger}
          onPipelineLoaded={() => setIsPipelinesOpen(false)}
        />
      )}

      {isHistoryOpen && (
        <ExecutionHistoryPanel
          onClose={() => setIsHistoryOpen(false)}
          refreshTrigger={historyRefreshTrigger}
          onOpenPipelines={() => { setIsHistoryOpen(false); setIsPipelinesOpen(true); }}
        />
      )}

      <ShipItModal isOpen={isShipItModalOpen} onClose={() => setIsShipItModalOpen(false)} />

      <TestRunOverlay
        isActive={isTestRunActive}
        onClose={() => setIsTestRunActive(false)}
        onRunComplete={() => setHistoryRefreshTrigger((n) => n + 1)}
      />

      {isDrawingOpen && <DrawingCanvasModal onClose={() => setIsDrawingOpen(false)} />}

      {/* Tutorial doc panel — shown on non-first-visit logins */}
      {isTutorialOpen && !showTour && (
        <TutorialModal
          onClose={() => {
            localStorage.setItem('forge_tutorial_seen', 'true');
            setIsTutorialOpen(false);
          }}
        />
      )}

      {/* Spotlight onboarding — shown on first login (DB-controlled) */}
      {showTour && (
        <OnboardingTour
          onComplete={() => {
            setShowTour(false);
            localStorage.setItem('forge_tutorial_seen', 'true');
            setIsTutorialOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
