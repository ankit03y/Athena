import { useState } from 'react';
import { Play, Clock, Edit3, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface NodeConfig {
    name: string;
    hostname?: string;
    auth?: { type: string; username?: string };
}

interface CommandConfig {
    cmd: string;
    logic: string;
}

interface Rule {
    name: string;
    nodes: NodeConfig[];
    commands: CommandConfig[];
    execution?: string;
    schedule?: string;
    // Legacy support
    command?: string;
    extraction_hint?: string;
    condition?: string;
    action?: string;
}

interface RuleCardProps {
    rule: Rule;
    ruleId: number;
    onExecute: (ruleId: number) => void;
    onEdit?: (ruleId: number) => void;
    isExecuting?: boolean;
}

export function RuleCard({ rule, ruleId, onExecute, onEdit, isExecuting }: RuleCardProps) {
    const [expanded, setExpanded] = useState(true);

    // Normalize data
    const nodes = rule.nodes || [];
    const commands = rule.commands || (rule.command ? [{ cmd: rule.command, logic: rule.extraction_hint || '' }] : []);

    return (
        <div className="card text-white bg-dark border-secondary mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">🧩</span>
                    <h5 className="mb-0">{rule.name || 'Automation Rule'}</h5>
                    {rule.execution === 'parallel' && (
                        <span className="badge bg-info text-dark ms-2">Parallel</span>
                    )}
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="btn btn-sm btn-outline-secondary border-0"
                >
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {expanded && (
                <div className="card-body">
                    {/* Nodes Section */}
                    <div className="mb-3">
                        <h6 className="card-subtitle mb-2 text-muted">📍 Target Nodes ({nodes.length})</h6>
                        <div className="d-flex flex-wrap gap-2">
                            {nodes.map((node, idx) => (
                                <span key={idx} className="badge bg-secondary p-2">
                                    <i className="bi bi-hdd-network me-1"></i>
                                    {node.name || node.hostname}
                                    {node.auth?.username && <small className="opacity-50 ms-1">({node.auth.username})</small>}
                                </span>
                            ))}
                            {nodes.length === 0 && <span className="text-muted small">No nodes specified</span>}
                        </div>
                    </div>

                    {/* Commands Section */}
                    <div className="mb-3">
                        <h6 className="card-subtitle mb-2 text-muted">💻 Commands</h6>
                        <ul className="list-group list-group-flush bg-transparent">
                            {commands.map((cmd, idx) => (
                                <li key={idx} className="list-group-item bg-transparent text-white border-secondary px-0 py-1">
                                    <div className="d-flex flex-column">
                                        <code className="text-success small">{cmd.cmd}</code>
                                        {cmd.logic && <small className="text-info opacity-75">Logic: {cmd.logic}</small>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Conditions & Actions (if legacy or explicit) */}
                    {(rule.condition || rule.action) && (
                        <div className="row g-2 mb-3">
                            {rule.condition && (
                                <div className="col-md-6">
                                    <div className="p-2 border border-warning rounded">
                                        <small className="text-warning d-block">⚖️ Condition</small>
                                        <span>{rule.condition}</span>
                                    </div>
                                </div>
                            )}
                            {rule.action && (
                                <div className="col-md-6">
                                    <div className="p-2 border border-danger rounded">
                                        <small className="text-danger d-block">⚡ Action</small>
                                        <span>{rule.action}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="card-footer border-secondary d-flex gap-2">
                <button
                    onClick={() => onEdit?.(ruleId)}
                    className="btn btn-sm btn-outline-light d-flex align-items-center gap-2"
                >
                    <Edit3 size={14} /> Edit
                </button>
                <button
                    onClick={() => onExecute(ruleId)}
                    disabled={isExecuting}
                    className="btn btn-sm btn-success d-flex align-items-center gap-2"
                >
                    {isExecuting ? (
                        <>
                            <Loader2 size={14} className="animate-spin" /> Running...
                        </>
                    ) : (
                        <>
                            <Play size={14} /> Execute Now
                        </>
                    )}
                </button>
                <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 ms-auto">
                    <Clock size={14} /> Schedule
                </button>
            </div>
        </div>
    );
}
