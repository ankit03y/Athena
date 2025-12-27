import React, { useEffect, useState, useRef } from 'react';
import { Plus, LayoutGrid, MoreVertical, Pencil, Trash2, MessageSquare } from 'lucide-react';

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
    const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchSessions();
    }, [currentSessionId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking on a three-dot button
            if (target.closest('.three-dot-btn')) {
                return;
            }
            if (menuRef.current && !menuRef.current.contains(target)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const handleDeleteSession = async (sessionId: number) => {
        setDeletingId(sessionId);
        setMenuOpenId(null);
        try {
            const res = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
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

    const handleRenameSession = async (sessionId: number) => {
        if (!editTitle.trim()) return;
        try {
            const res = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editTitle })
            });
            if (res.ok) {
                fetchSessions();
            }
        } catch (error) {
            console.error("Failed to rename session", error);
        } finally {
            setEditingId(null);
            setEditTitle('');
        }
    };

    const startEditing = (session: Session) => {
        setEditingId(session.id);
        setEditTitle(session.title);
        setMenuOpenId(null);
    };

    return (
        <div
            className="glass"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.25rem',
                borderRadius: 0,
                borderRight: '1px solid var(--border-subtle)',
                borderLeft: 'none',
                borderTop: 'none',
                borderBottom: 'none'
            }}
        >
            {/* Logo */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Athena Logo */}
                    <img
                        src="/athena-logo.png"
                        alt="Athena"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            objectFit: 'cover'
                        }}
                    />
                    <div>
                        <div className="text-caps" style={{ marginBottom: '2px' }}>Welcome to</div>
                        <div style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            Athena Agent
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <button
                className="btn-athena"
                style={{
                    width: '100%',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                }}
                onClick={() => {
                    onSelectSession(null);
                    onSelectView?.('chat');
                }}
            >
                <Plus size={18} />
                New Chat
            </button>

            <button
                className="btn-ghost"
                style={{
                    width: '100%',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: currentView === 'history' ? 'var(--bg-card)' : 'transparent'
                }}
                onClick={() => onSelectView?.('history')}
            >
                <LayoutGrid size={16} />
                Dashboard
            </button>

            {/* Sessions Label */}
            <div className="text-caps" style={{ marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
                Recent Chats
            </div>

            {/* Sessions List */}
            <div style={{ flex: 1, overflow: 'auto', marginRight: '-0.5rem', paddingRight: '0.5rem' }}>
                {sessions.map(session => (
                    <div
                        key={session.id}
                        className={`sidebar-item ${currentSessionId === session.id ? 'active' : ''}`}
                        onClick={() => {
                            if (editingId !== session.id) {
                                onSelectSession(session.id);
                                onSelectView?.('chat');
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.25rem',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                            <MessageSquare size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {editingId === session.id ? (
                                    <input
                                        type="text"
                                        className="input-athena"
                                        style={{
                                            padding: '0.375rem 0.5rem',
                                            fontSize: '0.875rem',
                                            width: '100%'
                                        }}
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRenameSession(session.id);
                                            if (e.key === 'Escape') { setEditingId(null); setEditTitle(''); }
                                        }}
                                        onBlur={() => handleRenameSession(session.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                ) : (
                                    <>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: 'var(--text-primary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {session.title}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            marginTop: '2px'
                                        }}>
                                            {new Date(session.created_at).toLocaleDateString()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Three Dot Menu */}
                        {editingId !== session.id && (
                            <button
                                className="three-dot-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(menuOpenId === session.id ? null : session.id);
                                }}
                                style={{ opacity: menuOpenId === session.id ? 1 : undefined }}
                            >
                                <MoreVertical size={16} />
                            </button>
                        )}

                        {/* Dropdown Menu */}
                        {menuOpenId === session.id && (
                            <div
                                ref={menuRef}
                                className="dropdown-menu"
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    right: '0',
                                    zIndex: 9999
                                }}
                            >
                                <div
                                    className="dropdown-item"
                                    onClick={(e) => { e.stopPropagation(); startEditing(session); }}
                                >
                                    <Pencil size={14} />
                                    Rename
                                </div>
                                <div
                                    className="dropdown-item danger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Delete this chat?')) {
                                            handleDeleteSession(session.id);
                                        }
                                    }}
                                >
                                    <Trash2 size={14} />
                                    {deletingId === session.id ? 'Deleting...' : 'Delete'}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: 'auto',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem'
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--athena-teal-dark), var(--athena-teal))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}>
                        U
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>User</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Local</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
