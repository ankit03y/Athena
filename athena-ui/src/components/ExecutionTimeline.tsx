import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Loader2, Server, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineStep {
    message: string;
    status?: 'success' | 'warning' | 'error' | 'in_progress';
    type?: 'step' | 'incident' | 'error' | 'complete';
    severity?: string;
    node?: string;
    timestamp?: string;
}

interface ExecutionTimelineProps {
    executionId: number;
    onComplete?: () => void;
    isCollapsible?: boolean;
    defaultExpanded?: boolean;
}

export function ExecutionTimeline({
    executionId,
    onComplete,
    isCollapsible = false,
    defaultExpanded = true
}: ExecutionTimelineProps) {
    const [steps, setSteps] = useState<TimelineStep[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    useEffect(() => {
        if (!executionId) return;

        console.log('Starting ExecutionTimeline stream for ID:', executionId);

        const eventSource = new EventSource(
            `http://localhost:8000/chat/execute/${executionId}/stream`
        );

        eventSource.onopen = () => {
            console.log('SSE Connection opened');
        };

        eventSource.onmessage = (event) => {
            console.log('SSE Event received:', event.data);
            try {
                const data = JSON.parse(event.data);

                setSteps(prev => [...prev, {
                    message: data.message,
                    status: data.status || (data.type === 'error' ? 'error' : 'success'),
                    type: data.type,
                    severity: data.severity,
                    node: data.node,
                    timestamp: new Date().toLocaleTimeString()
                }]);

                if (data.type === 'complete' || data.type === 'error') {
                    setIsComplete(true);
                    eventSource.close();
                    onComplete?.();
                }
            } catch (e) {
                console.error('Failed to parse SSE event:', e);
            }
        };

        eventSource.onerror = (e) => {
            console.error('SSE error:', e);
            setError('Connection lost. Please try again.');
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [executionId, onComplete]);

    const getStatusIcon = (status: string | undefined) => {
        switch (status) {
            case 'success':
                return <CheckCircle size={14} style={{ color: 'var(--success)' }} />;
            case 'warning':
                return <AlertTriangle size={14} style={{ color: 'var(--athena-gold)' }} />;
            case 'error':
                return <XCircle size={14} style={{ color: 'var(--error)' }} />;
            case 'in_progress':
                return <Loader2 size={14} className="animate-spin" style={{ color: 'var(--athena-teal)' }} />;
            default:
                return <CheckCircle size={14} style={{ color: 'var(--success)' }} />;
        }
    };

    if (error) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: 'var(--error)',
                fontSize: '0.875rem'
            }}>
                <XCircle size={16} />
                {error}
            </div>
        );
    }

    // Collapsible header for completed timelines
    if (isCollapsible && !isExpanded) {
        const successCount = steps.filter(s => s.status === 'success').length;
        const errorCount = steps.filter(s => s.status === 'error' || s.type === 'incident').length;

        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="btn-ghost"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    width: 'auto'
                }}
            >
                <Activity size={14} style={{ color: 'var(--athena-teal)' }} />
                View Timeline ({successCount} steps{errorCount > 0 ? `, ${errorCount} issues` : ''})
                <ChevronDown size={14} />
            </button>
        );
    }

    return (
        <div
            className="glass-card animate-fadeInUp"
            style={{
                marginTop: '1rem',
                marginLeft: isCollapsible ? '0' : '2.75rem',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-subtle)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} style={{ color: 'var(--athena-teal)' }} />
                    <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                    }}>
                        Execution Timeline
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {!isComplete ? (
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.75rem',
                            color: 'var(--athena-teal)'
                        }}>
                            <Loader2 size={12} className="animate-spin" />
                            Running...
                        </span>
                    ) : (
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.75rem',
                            color: 'var(--success)'
                        }}>
                            <CheckCircle size={12} />
                            Complete
                        </span>
                    )}
                    {isCollapsible && (
                        <button
                            onClick={() => setIsExpanded(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                display: 'flex'
                            }}
                        >
                            <ChevronUp size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Steps */}
            <div style={{
                maxHeight: '280px',
                overflowY: 'auto',
                padding: '0.5rem'
            }}>
                {steps.length === 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '1rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.875rem'
                    }}>
                        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--athena-teal)' }} />
                        Initializing...
                    </div>
                )}

                {steps.map((step, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.625rem 0.75rem',
                            borderRadius: '6px',
                            background: step.type === 'incident'
                                ? 'rgba(239, 68, 68, 0.08)'
                                : step.type === 'complete'
                                    ? 'rgba(34, 197, 94, 0.08)'
                                    : 'transparent',
                            marginBottom: '0.25rem'
                        }}
                        className="animate-fadeInUp"
                    >
                        {/* Status Icon */}
                        <div style={{
                            marginTop: '2px',
                            flexShrink: 0
                        }}>
                            {getStatusIcon(step.status)}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '0.5rem'
                            }}>
                                <span style={{
                                    fontSize: '0.8125rem',
                                    color: step.type === 'incident'
                                        ? 'var(--error)'
                                        : 'var(--text-secondary)',
                                    lineHeight: 1.4
                                }}>
                                    {step.message}
                                </span>

                                {step.severity && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase',
                                        background: step.severity === 'critical'
                                            ? 'rgba(239, 68, 68, 0.2)'
                                            : 'rgba(234, 179, 8, 0.2)',
                                        color: step.severity === 'critical'
                                            ? 'var(--error)'
                                            : 'var(--athena-gold)',
                                        flexShrink: 0
                                    }}>
                                        {step.severity}
                                    </span>
                                )}
                            </div>

                            {/* Node & Timestamp */}
                            {(step.node || step.timestamp) && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginTop: '0.25rem'
                                }}>
                                    {step.node && (
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            <Server size={10} />
                                            {step.node}
                                        </span>
                                    )}
                                    {step.timestamp && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            {step.timestamp}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
