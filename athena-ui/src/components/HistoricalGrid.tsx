import { useState, useEffect } from 'react';

interface Execution {
    id: number;
    rule_name: string;
    status: string;
    started_at: string;
    completed_at?: string;
    condition_met: boolean;
    parsed_value?: string;
}

export function HistoricalGrid() {
    const [executions, setExecutions] = useState<Execution[]>([]);

    useEffect(() => {
        fetchExecutions();
    }, []);

    const fetchExecutions = async () => {
        try {
            const res = await fetch('http://localhost:8000/chat/executions');
            if (res.ok) {
                const data = await res.json();
                setExecutions(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="container-fluid p-4 bg-dark h-100 fs-6">
            <h2 className="text-white mb-4">
                <i className="bi bi-grid-3x3-gap-fill me-2"></i>
                Historical Execution Data
            </h2>

            <div className="card bg-secondary bg-opacity-10 border-secondary">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-dark table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Rule Name</th>
                                    <th>Status</th>
                                    <th>Start Time</th>
                                    <th>Duration</th>
                                    <th>Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {executions.map(ex => (
                                    <tr key={ex.id}>
                                        <td>#{ex.id}</td>
                                        <td className="fw-bold text-info">{ex.rule_name}</td>
                                        <td>
                                            <span className={`badge bg-${ex.status === 'COMPLETED' ? 'success' :
                                                    ex.status === 'FAILED' ? 'danger' : 'primary'
                                                }`}>
                                                {ex.status}
                                            </span>
                                        </td>
                                        <td>{new Date(ex.started_at).toLocaleString()}</td>
                                        <td>
                                            {ex.completed_at ?
                                                `${Math.round((new Date(ex.completed_at).getTime() - new Date(ex.started_at).getTime()) / 1000)}s`
                                                : '-'}
                                        </td>
                                        <td>
                                            {ex.condition_met ? (
                                                <span className="text-warning">
                                                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                                    Condition Met
                                                </span>
                                            ) : (
                                                <span className="text-success">
                                                    <i className="bi bi-check-circle me-1"></i>
                                                    OK
                                                </span>
                                            )}
                                            {ex.parsed_value && <span className="ms-2 badge bg-secondary">{ex.parsed_value}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="card-footer border-secondary text-muted small">
                    Showing last 50 executions
                </div>
            </div>
        </div>
    );
}
