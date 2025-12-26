import { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, AlertTriangle, Clock,
    ChevronDown, ChevronUp, Terminal, Activity,
    RefreshCw
} from 'lucide-react';
import type { ExecutionDetails, ExecutionResult, ExecutionStatus } from '../types';
import { executionApi } from '../api';

interface ExecutionResultsProps {
    executionId: number | null;
    onClose?: () => void;
}

export function ExecutionResults({ executionId, onClose }: ExecutionResultsProps) {
    const [execution, setExecution] = useState<ExecutionDetails | null>(null);
    const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (executionId) {
            loadExecution();
            // Poll for updates if still running
            const interval = setInterval(() => {
                if (execution?.status === 'pending' || execution?.status === 'running') {
                    loadExecution();
                }
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [executionId, execution?.status]);

    const loadExecution = async () => {
        if (!executionId) return;
        setLoading(true);
        try {
            const data = await executionApi.get(executionId);
            setExecution(data);
        } catch (error) {
            console.error('Failed to load execution:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleResult = (resultId: number) => {
        setExpandedResults(prev => {
            const next = new Set(prev);
            if (next.has(resultId)) {
                next.delete(resultId);
            } else {
                next.add(resultId);
            }
            return next;
        });
    };

    const getStatusIcon = (status: ExecutionStatus) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-400" />;
            case 'partial':
                return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case 'running':
                return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
            default:
                return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusBadge = (status: ExecutionStatus) => {
        const styles: Record<ExecutionStatus, string> = {
            success: 'bg-green-500/10 text-green-400',
            failed: 'bg-red-500/10 text-red-400',
            partial: 'bg-amber-500/10 text-amber-400',
            running: 'bg-blue-500/10 text-blue-400',
            pending: 'bg-slate-500/10 text-slate-400',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${styles[status]}`}>
                {status}
            </span>
        );
    };

    if (!executionId) {
        return null;
    }

    if (!execution) {
        return (
            <div className="glass rounded-xl p-8 text-center">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-400 animate-spin" />
                <p className="text-slate-400">Loading execution results...</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-xl overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                        <h2 className="font-semibold text-white">{execution.runbook_name}</h2>
                        <p className="text-xs text-slate-400">
                            Execution #{execution.id} • {execution.triggered_by}
                        </p>
                    </div>
                </div>
                {getStatusBadge(execution.status)}
            </div>

            {/* Results */}
            <div className="divide-y divide-slate-700/30">
                {execution.results.map((result) => (
                    <div key={result.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Result header */}
                        <button
                            onClick={() => toggleResult(result.id)}
                            className="w-full p-4 flex items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-3">
                                {getStatusIcon(result.status)}
                                <div>
                                    <span className="font-medium text-slate-200">{result.hostname}</span>
                                    {result.ai_summary && (
                                        <p className="text-sm text-slate-400 mt-0.5">{result.ai_summary}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {result.exit_code !== null && (
                                    <span className={`text-xs px-2 py-1 rounded ${result.exit_code === 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                        }`}>
                                        Exit: {result.exit_code}
                                    </span>
                                )}
                                {expandedResults.has(result.id) ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                            </div>
                        </button>

                        {/* Expanded content */}
                        {expandedResults.has(result.id) && (
                            <div className="px-4 pb-4 space-y-4 animate-fadeIn">
                                {/* AI Resources */}
                                {result.ai_resources && result.ai_resources.length > 0 && (
                                    <div>
                                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <Activity className="w-3 h-3" /> AI Analysis
                                        </h4>
                                        <div className="grid gap-2">
                                            {result.ai_resources.map((resource, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg ${resource.status === 'OK' ? 'bg-green-500/5 border border-green-500/20' :
                                                        resource.status === 'WARNING' ? 'bg-amber-500/5 border border-amber-500/20' :
                                                            resource.status === 'CRITICAL' ? 'bg-red-500/5 border border-red-500/20' :
                                                                'bg-slate-500/5 border border-slate-500/20'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-slate-200">{resource.name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${resource.status === 'OK' ? 'bg-green-500/10 text-green-400' :
                                                            resource.status === 'WARNING' ? 'bg-amber-500/10 text-amber-400' :
                                                                resource.status === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                                                                    'bg-slate-500/10 text-slate-400'
                                                            }`}>
                                                            {resource.status}
                                                        </span>
                                                    </div>
                                                    {resource.reasoning && (
                                                        <p className="text-sm text-slate-400 mt-1">{resource.reasoning}</p>
                                                    )}
                                                    {resource.metric_value && (
                                                        <p className="text-xs text-slate-500 mt-1 font-mono">
                                                            Metric: {resource.metric_value}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Raw Output */}
                                {result.stdout && (
                                    <div>
                                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <Terminal className="w-3 h-3" /> Raw Output
                                        </h4>
                                        <pre className="p-3 bg-black/50 rounded-lg text-xs font-mono text-green-400 overflow-x-auto max-h-64">
                                            {result.stdout}
                                        </pre>
                                    </div>
                                )}

                                {/* Stderr */}
                                {result.stderr && (
                                    <div>
                                        <h4 className="text-xs text-red-400 uppercase tracking-wider mb-2">Errors</h4>
                                        <pre className="p-3 bg-red-500/5 rounded-lg text-xs font-mono text-red-400 overflow-x-auto">
                                            {result.stderr}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {execution.results.length === 0 && (
                    <div className="p-4">
                        {execution.status === 'running' || execution.status === 'pending' ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                                    <span className="text-slate-300 font-medium">Execution in progress...</span>
                                </div>

                                {/* Live Console */}
                                <div className="bg-black/70 rounded-lg p-4 font-mono text-sm">
                                    <div className="flex items-center gap-2 text-slate-400 mb-3 border-b border-slate-700 pb-2">
                                        <Terminal className="w-4 h-4" />
                                        <span>Live Console</span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <div className="text-green-400">$ Initializing execution...</div>
                                        <div className="text-blue-400">→ Connecting to servers...</div>
                                        <div className="text-slate-400">→ Running commands on all targets...</div>
                                        <div className="text-amber-400 animate-pulse">⏳ Waiting for responses...</div>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500">
                                    Results will appear automatically when execution completes.
                                    Polling every 2 seconds...
                                </p>
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-4">No results available</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
