import React, { useEffect, useState } from 'react';

interface Session {
    id: number;
    title: string;
    created_at: string;
}

interface SidebarProps {
    onSelectSession: (id: number | null) => void;
    currentSessionId: number | null;
    currentView?: 'chat' | 'history';
    onSelectView?: (view: 'chat' | 'history') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectSession, currentSessionId, currentView, onSelectView }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        fetchSessions();
    }, [currentSessionId]); // Refetch when session changes (e.g. new session created)

    const fetchSessions = async () => {
        try {
            const res = await fetch('http://localhost:8000/chat/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        }
    };

    const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the session
        if (!window.confirm('Are you sure you want to delete this chat thread?')) {
            return;
        }
        setDeletingId(sessionId);
        try {
            const res = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                // If we deleted the current session, clear selection
                if (currentSessionId === sessionId) {
                    onSelectSession(null);
                }
                fetchSessions();
            }
        } catch (error) {
            console.error("Failed to delete session", error);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={{ width: '100%', height: '100%', borderRight: '1px solid #333', overflow: 'hidden' }}>
            <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <i className="bi bi-robot fs-4 me-2"></i>
                <span className="fs-4">Athena Agent</span>
            </a>
            <hr />
            <button
                className="btn btn-primary w-100 mb-2"
                onClick={() => {
                    onSelectSession(null);
                    onSelectView?.('chat');
                }}
            >
                <i className="bi bi-plus-lg me-2"></i>
                New Chat
            </button>
            <button
                className={`btn w-100 mb-3 ${currentView === 'history' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => onSelectView?.('history')}
            >
                <i className="bi bi-grid-3x3 me-2"></i>
                Dashboard
            </button>

            <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {sessions.map(session => (
                    <div
                        key={session.id}
                        className={`list-group-item list-group-item-action py-3 lh-sm d-flex justify-content-between align-items-start ${currentSessionId === session.id ? 'active' : 'bg-dark text-white border-bottom-0'}`}
                        onClick={() => {
                            onSelectSession(session.id);
                            onSelectView?.('chat');
                        }}
                        style={currentSessionId === session.id ? { cursor: 'pointer' } : { borderColor: '#444', cursor: 'pointer' }}
                    >
                        <div className="flex-grow-1 overflow-hidden">
                            <strong className="mb-1 text-truncate d-block">{session.title}</strong>
                            <div className="small opacity-50">
                                {new Date(session.created_at).toLocaleDateString()}
                            </div>
                        </div>
                        <button
                            className={`btn btn-sm ${currentSessionId === session.id ? 'btn-outline-light' : 'btn-outline-danger'} ms-2`}
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            disabled={deletingId === session.id}
                            title="Delete chat"
                        >
                            {deletingId === session.id ? (
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                            ) : (
                                <i className="bi bi-trash"></i>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-auto">
                <hr />
                <div className="d-flex align-items-center text-white text-decoration-none" >
                    <img src="https://github.com/mdo.png" alt="" width="32" height="32" className="rounded-circle me-2" />
                    <strong>User</strong>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

