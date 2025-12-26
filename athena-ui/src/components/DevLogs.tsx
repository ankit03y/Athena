import { useState, useEffect } from 'react';
import { X, Terminal, Trash2 } from 'lucide-react';

interface DevLogsProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    formatted?: string;
}

// Parse SSE event JSON and return plain English
function formatLogMessage(message: string): { formatted: string; level: 'info' | 'warn' | 'error' } {
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
                        formatted: `🚨 INCIDENT${node}: ${json.details?.summary || msg}`,
                        level: severity === 'critical' ? 'error' : 'warn'
                    };
                } else if (type === 'error') {
                    return { formatted: `❌ Error${node}: ${msg}`, level: 'error' };
                } else if (type === 'complete') {
                    return { formatted: `✅ ${msg}`, level: 'info' };
                } else {
                    const status = json.status === 'success' ? '✓' : '→';
                    return { formatted: `${status} ${msg}${node}`, level: 'info' };
                }
            }
        } catch {
            // Not valid JSON, return as-is
        }
    }

    // Other common patterns
    if (message.includes('Execution complete')) {
        return { formatted: '✅ Execution finished', level: 'info' };
    }
    if (message.includes('SSE Connection opened')) {
        return { formatted: '🔗 Connected to execution stream', level: 'info' };
    }
    if (message.includes('Executing rule:')) {
        const ruleId = message.match(/rule:\s*(\d+)/)?.[1];
        return { formatted: `▶️ Starting rule #${ruleId}`, level: 'info' };
    }
    if (message.includes('Execution started:')) {
        return { formatted: '📡 Execution initiated', level: 'info' };
    }

    return { formatted: message, level: 'info' };
}

export function DevLogs({ isOpen, onClose }: DevLogsProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);

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

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'text-danger';
            case 'warn': return 'text-warning';
            case 'debug': return 'text-secondary';
            default: return 'text-success';
        }
    };

    return (
        <div className="position-fixed top-0 end-0 bottom-0 bg-dark border-start shadow" style={{ width: '400px', zIndex: 1050 }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                <div className="d-flex align-items-center gap-2 text-white">
                    <Terminal size={16} />
                    <span className="fw-medium">Activity Log</span>
                    <span className="badge bg-secondary">{logs.length}</span>
                </div>
                <div className="d-flex gap-1">
                    <button
                        onClick={() => setLogs([])}
                        className="btn btn-sm btn-outline-secondary"
                        title="Clear logs"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Logs */}
            <div className="overflow-auto p-3" style={{ height: 'calc(100% - 100px)', fontFamily: 'monospace', fontSize: '12px' }}>
                {logs.length === 0 && (
                    <div className="text-muted text-center py-5">
                        No activity yet. Actions will appear here.
                    </div>
                )}

                <div className="d-flex flex-column gap-1">
                    {logs.map((log, idx) => (
                        <div key={idx} className="d-flex gap-2">
                            <span className="text-muted flex-shrink-0">{log.timestamp}</span>
                            <span className={`flex-grow-1 ${getLevelColor(log.level)}`}>
                                {log.formatted || log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-top text-muted small">
                Showing execution activity and system events
            </div>
        </div>
    );
}

