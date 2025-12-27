import { useState } from 'react';
import { ChatView } from './components/ChatView';
import { DevLogs } from './components/DevLogs';
import Sidebar from './components/Sidebar';
import { HistoricalGrid } from './components/HistoricalGrid';
import { ToastProvider } from './components/Toast';

function App() {
  const [showDevLogs, setShowDevLogs] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'history'>('chat');
  const [sidebarWidth, setSidebarWidth] = useState(280);

  const handleSelectSession = (id: number | null) => {
    setSelectedSessionId(id);
    setCurrentView('chat');
  };

  return (
    <ToastProvider>
      {/* Aurora Background */}
      <div className="aurora-bg" />
      <div className="aurora-orb" />

      {/* Main Layout */}
      <div style={{
        display: 'flex',
        height: '100vh',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Sidebar */}
        <div style={{
          width: `${sidebarWidth}px`,
          flexShrink: 0,
          height: '100%'
        }}>
          <Sidebar
            onSelectSession={setSelectedSessionId}
            currentSessionId={selectedSessionId}
            currentView={currentView}
            onSelectView={setCurrentView}
          />
        </div>

        {/* Resize Handle */}
        <div
          style={{
            width: '1px',
            background: 'var(--border-subtle)',
            cursor: 'col-resize',
            flexShrink: 0,
            position: 'relative'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;

            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = startWidth + (moveEvent.clientX - startX);
              setSidebarWidth(Math.max(220, Math.min(400, newWidth)));
            };

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        >
          {/* Hover indicator */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-2px',
            width: '5px',
            height: '100%',
            background: 'transparent',
            transition: 'background 0.2s'
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--athena-teal)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          />
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0
        }}>
          {/* Content Area */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {currentView === 'chat' ? (
              <ChatView
                sessionId={selectedSessionId}
                onSessionChange={handleSelectSession}
                onShowDevLogs={() => setShowDevLogs(true)}
              />
            ) : (
              <HistoricalGrid />
            )}
          </div>

          {/* Dev Logs Panel */}
          <DevLogs isOpen={showDevLogs} onClose={() => setShowDevLogs(false)} />
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
