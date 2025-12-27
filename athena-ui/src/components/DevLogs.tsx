import { useState, useEffect, useRef } from 'react';
import { X, Terminal, Trash2, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';

interface DevLogsProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug' | 'success';
    message: string;
    formatted?: string;
}

// Parse SSE event JSON and return plain English
function formatLogMessage(message: string): { formatted: string; level: 'info' | 'warn' | 'error' | 'success' } {
    // Try to parse SSE event format
    if (message.includes('SSE Event received:')) {
        try {
            const jsonStart = message.indexOf('{');
            if (jsonStart !== -1) {
                const json = JSON.parse(message.substring(jsonStart));
                const type = json.type || 'step';
                const msg = json.message || '';
                const node = json.node ? ` (${json.node})` : '';
                const severity = json.severity;

                if (type === 'incident') {
                    return {
                        formatted: `INCIDENT${node}: ${json.details?.summary || msg}`,
                        level: severity === 'critical' ? 'error' : 'warn'
                    };
                } else if (type === 'error') {
                    return { formatted: `Error${node}: ${msg}`, level: 'error' };
                } else if (type === 'complete') {
                    return { formatted: msg, level: 'success' };
                } else {
                    return { formatted: `${msg}${node}`, level: 'info' };
                }
            }
        } catch {
            // Not valid JSON, return as-is
        }
    }

    // Other common patterns
    if (message.includes('Execution complete')) {
        return { formatted: 'Execution finished', level: 'success' };
    }
    if (message.includes('SSE Connection opened')) {
        return { formatted: 'Connected to execution stream', level: 'info' };
    }
    if (message.includes('Executing rule:')) {
        const ruleId = message.match(/rule:\s*(\d+)/)?.[1];
        return { formatted: `Starting rule #${ruleId}`, level: 'info' };
    }
    if (message.includes('Execution started:')) {
        return { formatted: 'Execution initiated', level: 'info' };
    }

    return { formatted: message, level: 'info' };
}

export function DevLogs({ isOpen, onClose }: DevLogsProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new logs
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Intercept console.log for dev logs
    useEffect(() => {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const addLog = (level: 'info' | 'warn' | 'error', ...args: any[]) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');

            const { formatted, level: parsedLevel } = formatLogMessage(message);

            setLogs(prev => [...prev.slice(-100), {
                timestamp: new Date().toISOString().split('T')[1].split('.')[0],
                level: level === 'info' ? parsedLevel : level,
                message,
                formatted
            }]);
        };

        console.log = (...args) => {
            originalLog.apply(console, args);
            addLog('info', ...args);
        };

        console.warn = (...args) => {
            originalWarn.apply(console, args);
            addLog('warn', ...args);
        };

        console.error = (...args) => {
            originalError.apply(console, args);
            addLog('error', ...args);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    if (!isOpen) return null;

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error':
                return <XCircle size={12} style={{ color: 'var(--error)' }} />;
            case 'warn':
                return <AlertTriangle size={12} style={{ color: 'var(--athena-gold)' }} />;
            case 'success':
                return <CheckCircle size={12} style={{ color: 'var(--success)' }} />;
            default:
                return <Info size={12} style={{ color: 'var(--athena-teal)' }} />;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'var(--error)';
            case 'warn': return 'var(--athena-gold)';
            case 'success': return 'var(--success)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div
            className="glass animate-slideIn"
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '380px',
                zIndex: 1050,
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid var(--border-subtle)',
                borderRadius: 0
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-subtle)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <Terminal size={18} style={{ color: 'var(--athena-teal)' }} />
                    <span style={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                    }}>
                        Activity Log
                    </span>
                    <span style={{
                        fontSize: '0.7rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '10px',
                        background: 'rgba(8, 145, 178, 0.15)',
                        color: 'var(--athena-teal)'
                    }}>
                        {logs.length}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setLogs([])}
                        className="btn-ghost"
                        style={{ padding: '0.375rem', minWidth: 'auto' }}
                        title="Clear logs"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={onClose}
                        className="btn-ghost"
                        style={{ padding: '0.375rem', minWidth: 'auto' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Logs */}
            <div
                ref={logsContainerRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '0.75rem',
                    fontFamily: "'SF Mono', 'Consolas', monospace",
                    fontSize: '0.75rem'
                }}
            >
                {logs.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        padding: '2rem'
                    }}>
                        <Terminal size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '0.8125rem' }}>No activity yet</p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.7 }}>
                            Actions will appear here
                        </p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {logs.map((log, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem',
                                padding: '0.375rem 0.5rem',
                                borderRadius: '4px',
                                background: log.level === 'error'
                                    ? 'rgba(239, 68, 68, 0.08)'
                                    : log.level === 'warn'
                                        ? 'rgba(234, 179, 8, 0.08)'
                                        : log.level === 'success'
                                            ? 'rgba(34, 197, 94, 0.08)'
                                            : 'transparent'
                            }}
                        >
                            <span style={{
                                color: 'var(--text-muted)',
                                flexShrink: 0,
                                opacity: 0.7
                            }}>
                                {log.timestamp}
                            </span>
                            <span style={{ flexShrink: 0, marginTop: '1px' }}>
                                {getLevelIcon(log.level)}
                            </span>
                            <span style={{
                                color: getLevelColor(log.level),
                                wordBreak: 'break-word'
                            }}>
                                {log.formatted || log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.7rem'
            }}>
                Showing execution activity and system events
            </div>
        </div>
    );
}
