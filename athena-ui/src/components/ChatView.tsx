import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, User, Terminal, Paperclip, FileSpreadsheet, Download, FileJson, FileText, Activity } from 'lucide-react';
import { RuleCard } from './RuleCard';
import { ExecutionTimeline } from './ExecutionTimeline';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    rule_id?: number;
    rule?: any;
    execution_id?: number;
    created_at?: string;
}

interface ChatViewProps {
    sessionId: number | null;
    onSessionChange?: (id: number) => void;
    onShowDevLogs: () => void;
}

export function ChatView({ sessionId, onSessionChange, onShowDevLogs }: ChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [executingRuleId, setExecutingRuleId] = useState<number | null>(null);
    const [executionId, setExecutionId] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load chat history when sessionId changes
    useEffect(() => {
        if (sessionId) {
            loadSessionHistory(sessionId);
        } else {
            setMessages([]); // New chat
        }
    }, [sessionId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSessionHistory = async (id: number) => {
        try {
            const res = await fetch(`http://localhost:8000/chat/sessions/${id}/messages`);
            if (res.ok) {
                const history = await res.json();
                setMessages(history.map((msg: any) => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    rule_id: msg.rule_id,
                    rule: msg.rule,
                    created_at: msg.created_at
                })));
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8000/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    session_id: sessionId
                })
            });

            const data = await res.json();

            // Perform Session update if we just created one
            if (!sessionId && data.session_id && onSessionChange) {
                onSessionChange(data.session_id);
            }

            const assistantMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.message || data.clarification || '',
                rule_id: data.rule_id,
                rule: data.rule
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [completedRuleIds, setCompletedRuleIds] = useState<Set<number>>(new Set());
    const [completedExecutions, setCompletedExecutions] = useState<Map<number, number>>(new Map()); // ruleId -> executionId
    const [uploadedNodes, setUploadedNodes] = useState<any[] | null>(null);
    const [showReportModal, setShowReportModal] = useState<number | null>(null);
    const [showTimeline, setShowTimeline] = useState<Set<number>>(new Set()); // Which rule timelines are expanded

    const handleDownloadReport = (ruleId: number, format: 'json' | 'csv' | 'excel') => {
        const url = `http://localhost:8000/chat/report/${ruleId}?format=${format}`;
        if (format === 'json') {
            // Open JSON in new tab
            window.open(url, '_blank');
        } else {
            // Download CSV/Excel
            const link = document.createElement('a');
            link.href = url;
            link.download = `report_rule_${ruleId}.${format === 'excel' ? 'xlsx' : 'csv'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        setShowReportModal(null);
    };

    const handleExecute = useCallback(async (ruleId: number) => {
        console.log('Executing rule:', ruleId);
        setExecutingRuleId(ruleId);

        try {
            const res = await fetch(`http://localhost:8000/chat/execute/${ruleId}`, {
                method: 'POST'
            });
            const data = await res.json();
            console.log('Execution started:', data);
            setExecutionId(data.execution_id);
        } catch (e) {
            console.error('Failed to start execution:', e);
            setExecutingRuleId(null);
        }
    }, []);

    const handleEdit = useCallback((ruleId: number) => {
        setInput(`Modify rule #${ruleId}: `);
        inputRef.current?.focus();
    }, []);

    const handleExecutionComplete = useCallback((ruleId?: number) => {
        console.log('Execution complete');
        if (ruleId) {
            setCompletedRuleIds(prev => new Set(prev).add(ruleId));
        }
        setExecutingRuleId(null);
        setExecutionId(null);
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/chat/upload-nodes', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setUploadedNodes(data.nodes);
                setInput(data.suggested_prompt);
                inputRef.current?.focus();
                console.log(`Uploaded ${data.node_count} nodes from file`);
            } else {
                console.error('Upload failed:', data.detail);
                alert(data.detail || 'Failed to upload file');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload file');
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(12px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                        src="/athena-logo.png"
                        alt="Athena"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            objectFit: 'cover'
                        }}
                    />
                    <div>
                        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Athena</h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Automation AI Agent</p>
                    </div>
                </div>
                <button
                    onClick={onShowDevLogs}
                    className="btn-ghost"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Terminal size={16} />
                    Dev Logs
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {messages.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        textAlign: 'center',
                        padding: '2rem'
                    }}>
                        <img
                            src="/athena-logo.png"
                            alt="Athena"
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '20px',
                                marginBottom: '1.5rem'
                            }}
                        />
                        <h2 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome to Athena</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '28rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                            I'm your automation assistant. Tell me what you want to monitor or automate in plain English.
                        </p>
                        <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '32rem', width: '100%' }}>
                            <ExamplePrompt
                                text="Check disk usage on db-server. Alert if above 80%."
                                onClick={(text) => setInput(text)}
                            />
                            <ExamplePrompt
                                text="Monitor memory on all web servers every 5 minutes."
                                onClick={(text) => setInput(text)}
                            />
                            <ExamplePrompt
                                text="Check if nginx is running on production server."
                                onClick={(text) => setInput(text)}
                            />
                        </div>
                    </div>
                )}

                <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '0 1.5rem' }}>
                    {messages.map((message) => (
                        <div key={message.id} style={{ marginBottom: '2rem' }} className="animate-fadeInUp">
                            <div style={{
                                display: 'flex',
                                gap: '0.75rem',
                                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                {message.role === 'assistant' && (
                                    <img
                                        src="/athena-logo.png"
                                        alt="Athena"
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            flexShrink: 0,
                                            objectFit: 'cover'
                                        }}
                                    />
                                )}

                                <div style={{
                                    maxWidth: message.role === 'user' ? '75%' : '85%',
                                    ...(message.role === 'user' ? {
                                        background: 'linear-gradient(135deg, var(--athena-teal), var(--athena-teal-dark))',
                                        color: 'white',
                                        borderRadius: '16px 16px 4px 16px',
                                        padding: '0.875rem 1.125rem'
                                    } : {
                                        color: 'var(--text-secondary)'
                                    })
                                }}>
                                    {message.role === 'assistant' && message.rule ? (
                                        <RuleCard
                                            rule={message.rule}
                                            ruleId={message.rule_id!}
                                            onExecute={handleExecute}
                                            onEdit={handleEdit}
                                            isExecuting={executingRuleId === message.rule_id}
                                        />
                                    ) : (
                                        <p style={{
                                            margin: 0,
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.6,
                                            fontSize: '0.9375rem'
                                        }}>{message.content}</p>
                                    )}
                                </div>

                                {message.role === 'user' && (
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-subtle)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <User size={18} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                )}
                            </div>

                            {/* Execution Timeline - shows under the rule that's executing */}
                            {message.rule_id && (
                                <>
                                    {/* Active execution */}
                                    {executingRuleId === message.rule_id && executionId && (
                                        <div style={{ marginLeft: '2.75rem', marginTop: '1rem' }}>
                                            <ExecutionTimeline
                                                executionId={executionId}
                                                onComplete={() => {
                                                    // Save execution ID for this rule
                                                    setCompletedExecutions(prev => new Map(prev).set(message.rule_id!, executionId));
                                                    handleExecutionComplete(message.rule_id);
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Completed execution - show View Timeline button */}
                                    {completedRuleIds.has(message.rule_id) && completedExecutions.has(message.rule_id) && executingRuleId !== message.rule_id && (
                                        <div style={{ marginLeft: '2.75rem', marginTop: '0.75rem' }}>
                                            {showTimeline.has(message.rule_id) ? (
                                                <ExecutionTimeline
                                                    executionId={completedExecutions.get(message.rule_id)!}
                                                    isCollapsible={true}
                                                    defaultExpanded={true}
                                                />
                                            ) : (
                                                <button
                                                    className="btn-ghost"
                                                    onClick={() => setShowTimeline(prev => new Set(prev).add(message.rule_id!))}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.5rem 0.75rem',
                                                        fontSize: '0.8125rem'
                                                    }}
                                                >
                                                    <Activity size={14} style={{ color: 'var(--athena-teal)' }} />
                                                    View Execution Log
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Download Report button - shows after execution completes */}
                                    {completedRuleIds.has(message.rule_id) && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            marginTop: '1rem',
                                            marginLeft: '3rem',
                                            position: 'relative'
                                        }}>
                                            <button
                                                className="btn-ghost"
                                                onClick={() => setShowReportModal(showReportModal === message.rule_id ? null : message.rule_id ?? null)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.5rem 0.875rem',
                                                    fontSize: '0.8125rem',
                                                    borderColor: showReportModal === message.rule_id ? 'var(--athena-teal)' : undefined
                                                }}
                                            >
                                                <Download size={14} />
                                                Download Report
                                            </button>

                                            {/* Download options dropdown */}
                                            {showReportModal === message.rule_id && (
                                                <div
                                                    className="dropdown-menu"
                                                    style={{
                                                        top: 'calc(100% + 4px)',
                                                        right: 0,
                                                        minWidth: '160px'
                                                    }}
                                                >
                                                    <div
                                                        className="dropdown-item"
                                                        onClick={() => handleDownloadReport(message.rule_id!, 'json')}
                                                    >
                                                        <FileJson size={14} style={{ color: 'var(--athena-teal)' }} />
                                                        View JSON
                                                    </div>
                                                    <div
                                                        className="dropdown-item"
                                                        onClick={() => handleDownloadReport(message.rule_id!, 'csv')}
                                                    >
                                                        <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                                                        Download CSV
                                                    </div>
                                                    <div
                                                        className="dropdown-item"
                                                        onClick={() => handleDownloadReport(message.rule_id!, 'excel')}
                                                        style={{ color: 'var(--success)' }}
                                                    >
                                                        <FileSpreadsheet size={14} />
                                                        Download Excel
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                            <img
                                src="/athena-logo.png"
                                alt="Athena"
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    flexShrink: 0,
                                    objectFit: 'cover'
                                }}
                            />
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--text-muted)'
                            }}>
                                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--athena-teal)' }} />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-slate-800/50 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto">
                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv,.xlsx,.xls"
                        className="d-none"
                        style={{ display: 'none' }}
                    />

                    {/* Uploaded nodes indicator */}
                    {uploadedNodes && uploadedNodes.length > 0 && (
                        <div className="mb-2 p-2 rounded bg-slate-800/50 border border-slate-700/50 d-flex align-items-center justify-content-between">
                            <span className="text-success small">
                                <FileSpreadsheet className="w-4 h-4 me-2" style={{ display: 'inline' }} />
                                {uploadedNodes.length} nodes loaded from file
                            </span>
                            <button
                                onClick={() => setUploadedNodes(null)}
                                className="btn btn-sm btn-outline-secondary py-0 px-1"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {/* Upload button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-ghost"
                            style={{ padding: '0.75rem', display: 'flex', alignItems: 'center' }}
                            title="Upload CSV/Excel with nodes"
                            disabled={loading}
                        >
                            <Paperclip size={20} />
                        </button>

                        {/* Textarea */}
                        <div style={{ flex: 1 }}>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="What would you like to automate? (Shift+Enter for new line)"
                                className="input-athena"
                                disabled={loading}
                                rows={2}
                                style={{ minHeight: '60px', resize: 'none' }}
                            />
                        </div>

                        {/* Send button */}
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="btn-athena"
                            style={{
                                padding: '0.75rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                opacity: loading || !input.trim() ? 0.5 : 1
                            }}
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Upload a CSV/Excel for bulk nodes, or type your automation request
                    </p>
                </div>
            </div>
        </div>
    );
}

function ExamplePrompt({ text, onClick }: { text: string; onClick: (text: string) => void }) {
    return (
        <button
            onClick={() => onClick(text)}
            className="glass-card"
            style={{
                textAlign: 'left',
                padding: '0.875rem 1rem',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)'
            }}
        >
            "{text}"
        </button>
    );
}
