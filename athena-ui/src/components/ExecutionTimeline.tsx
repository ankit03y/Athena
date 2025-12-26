import { useState, useEffect } from 'react';

interface TimelineStep {
    message: string;
    status?: 'success' | 'warning' | 'error' | 'in_progress';
    type?: 'step' | 'incident' | 'error' | 'complete';
    severity?: string;
    node?: string;
}

interface ExecutionTimelineProps {
    executionId: number;
    onComplete?: () => void;
}

export function ExecutionTimeline({ executionId, onComplete }: ExecutionTimelineProps) {
    const [steps, setSteps] = useState<TimelineStep[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                    node: data.node
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

    if (error) {
        return (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <div>{error}</div>
            </div>
        );
    }

    return (
        <div className="card bg-dark border-secondary">
            <div className="card-header border-secondary d-flex justify-content-between align-items-center">
                <span className="text-white">
                    <i className="bi bi-activity me-2"></i>
                    Execution Timeline
                </span>
                {!isComplete ? (
                    <span className="text-info small">
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Running...
                    </span>
                ) : (
                    <span className="text-success small">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        Complete
                    </span>
                )}
            </div>
            <ul className="list-group list-group-flush">
                {steps.length === 0 && (
                    <li className="list-group-item bg-transparent text-muted">
                        Initialising...
                    </li>
                )}
                {steps.map((step, idx) => (
                    <li key={idx} className={`list-group-item bg-transparent text-white border-secondary ${step.type === 'incident' ? 'bg-danger bg-opacity-10' : ''}`}>
                        <div className="d-flex align-items-start">
                            <div className="me-3 mt-1">
                                {step.status === 'success' && <i className="bi bi-check-circle-fill text-success"></i>}
                                {step.status === 'warning' && <i className="bi bi-exclamation-triangle-fill text-warning"></i>}
                                {step.status === 'error' && <i className="bi bi-x-circle-fill text-danger"></i>}
                                {step.status === 'in_progress' && <span className="spinner-grow spinner-grow-sm text-primary" role="status"></span>}
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between">
                                    <span>{step.message}</span>
                                    {step.severity && (
                                        <span className={`badge bg-${step.severity === 'critical' ? 'danger' : 'warning'} text-dark`}>
                                            {step.severity}
                                        </span>
                                    )}
                                </div>
                                {step.node && (
                                    <small className="text-muted d-block mt-1">
                                        <i className="bi bi-server me-1"></i>
                                        {step.node}
                                    </small>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
