import { useState } from 'react';
import { Play, Clock, Pencil, ChevronDown, ChevronUp, Loader2, Server, Terminal, Zap, Copy, Check } from 'lucide-react';

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
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const nodes = rule.nodes || [];
    const commands = rule.commands || (rule.command ? [{ cmd: rule.command, logic: rule.extraction_hint || '' }] : []);

    const copyCommand = async (cmd: string, idx: number) => {
        try {
            await navigator.clipboard.writeText(cmd);
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx(null), 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div
            className="glass-card animate-fadeInUp"
            style={{
                marginBottom: '1rem',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
                    cursor: 'pointer'
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--athena-teal), var(--athena-teal-dark))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Zap size={16} color="white" />
                    </div>
                    <div>
                        <h3 style={{
                            margin: 0,
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            {rule.name || 'Automation Rule'}
                        </h3>
                        {rule.execution === 'parallel' && (
                            <span style={{
                                fontSize: '0.7rem',
                                color: 'var(--athena-teal-light)',
                                fontWeight: 500
                            }}>
                                Parallel Execution
                            </span>
                        )}
                    </div>
                </div>
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.25rem'
                    }}
                >
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>

            {/* Body */}
            {expanded && (
                <div style={{ padding: '1rem 1.25rem' }}>
                    {/* Nodes */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.5rem',
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <Server size={12} />
                            Target Nodes ({nodes.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                            {nodes.map((node, idx) => (
                                <span
                                    key={idx}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '5px',
                                        background: 'rgba(8, 145, 178, 0.15)',
                                        border: '1px solid rgba(8, 145, 178, 0.3)',
                                        fontSize: '0.75rem',
                                        color: 'var(--athena-teal-light)',
                                        fontWeight: 500
                                    }}
                                >
                                    {node.name || node.hostname}
                                </span>
                            ))}
                            {nodes.length === 0 && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    No nodes specified
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Commands - with scroll if many */}
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.5rem',
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <Terminal size={12} />
                            Commands ({commands.length})
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.375rem',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            paddingRight: '0.25rem'
                        }}>
                            {commands.map((cmd, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        border: '1px solid var(--border-subtle)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                                        <code style={{
                                            color: 'var(--success)',
                                            fontSize: '0.8125rem',
                                            fontFamily: "'SF Mono', 'Consolas', monospace"
                                        }}>
                                            {cmd.cmd}
                                        </code>
                                        {cmd.logic && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--athena-gold)',
                                                opacity: 0.9
                                            }}>
                                                — {cmd.logic}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); copyCommand(cmd.cmd, idx); }}
                                        title="Copy command"
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '0.25rem',
                                            cursor: 'pointer',
                                            color: copiedIdx === idx ? 'var(--success)' : 'var(--text-muted)',
                                            display: 'flex',
                                            transition: 'color 0.2s'
                                        }}
                                    >
                                        {copiedIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderTop: '1px solid var(--border-subtle)',
                background: 'rgba(0, 0, 0, 0.15)'
            }}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit?.(ruleId); }}
                    className="btn-ghost"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.8125rem'
                    }}
                >
                    <Pencil size={14} /> Edit
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onExecute(ruleId); }}
                    disabled={isExecuting}
                    className="btn-gold"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.8125rem',
                        opacity: isExecuting ? 0.6 : 1
                    }}
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
                <button
                    className="btn-ghost"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.8125rem',
                        marginLeft: 'auto'
                    }}
                >
                    <Clock size={14} /> Schedule
                </button>
            </div>
        </div>
    );
}

