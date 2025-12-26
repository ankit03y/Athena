import { useState, useEffect } from 'react';
import { ChatView } from './components/ChatView';
import { DevLogs } from './components/DevLogs';
import Sidebar from './components/Sidebar';
import { HistoricalGrid } from './components/HistoricalGrid';

function App() {
  const [showDevLogs, setShowDevLogs] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'history'>('chat');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarWidth, setSidebarWidth] = useState(280);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  const handleSelectSession = (id: number | null) => {
    setSelectedSessionId(id);
    setCurrentView('chat');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}>
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
          width: '4px',
          background: theme === 'dark' ? '#333' : '#ddd',
          cursor: 'col-resize',
          flexShrink: 0
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            setSidebarWidth(Math.max(200, Math.min(400, newWidth)));
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      />

      {/* Main Content */}
      <div className="d-flex flex-column flex-grow-1" style={{ overflow: 'hidden' }}>
        {/* Theme Toggle Header */}
        <div
          className="d-flex justify-content-center align-items-center py-2 border-bottom"
          style={{ background: theme === 'dark' ? '#1a1a2e' : '#f8f9fa', flexShrink: 0 }}
        >
          <button
            onClick={toggleTheme}
            className={`btn btn-sm ${theme === 'dark' ? 'btn-outline-light' : 'btn-outline-dark'} d-flex align-items-center gap-2`}
          >
            {theme === 'dark' ? (
              <>
                <i className="bi bi-sun-fill"></i>
                Light Mode
              </>
            ) : (
              <>
                <i className="bi bi-moon-fill"></i>
                Dark Mode
              </>
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-grow-1" style={{ overflow: 'auto' }}>
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

        <DevLogs isOpen={showDevLogs} onClose={() => setShowDevLogs(false)} />
      </div>
    </div>
  );
}

export default App;

