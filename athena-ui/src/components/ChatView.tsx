import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Bot, User, Terminal, Paperclip, FileSpreadsheet, Download, FileJson, FileText } from 'lucide-react';
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
    const [uploadedNodes, setUploadedNodes] = useState<any[] | null>(null);
    const [showReportModal, setShowReportModal] = useState<number | null>(null);

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
        <div className="flex flex-col h-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Athena</h1>
                        <p className="text-xs text-slate-500">Automation AI Agent</p>
                    </div>
                </div>
                <button
                    onClick={onShowDevLogs}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                >
                    <Terminal className="w-4 h-4" />
                    Dev Logs
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                            <Bot className="w-10 h-10 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Athena</h2>
                        <p className="text-slate-400 max-w-md mb-8">
                            I'm your automation assistant. Tell me what you want to monitor or automate in plain English.
                        </p>
                        <div className="grid gap-3 max-w-lg">
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

                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((message) => (
                        <div key={message.id}>
                            <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {message.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}

                                <div className={`max-w-xl ${message.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3'
                                    : 'text-slate-300'
                                    }`}>
                                    {message.role === 'assistant' && message.rule ? (
                                        <RuleCard
                                            rule={message.rule}
                                            ruleId={message.rule_id!}
                                            onExecute={handleExecute}
                                            onEdit={handleEdit}
                                            isExecuting={executingRuleId === message.rule_id}
                                        />
                                    ) : (
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    )}
                                </div>

                                {message.role === 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-slate-300" />
                                    </div>
                                )}
                            </div>

                            {/* Execution Timeline - shows under the rule that's executing */}
                            {message.rule_id && (
                                <>
                                    {/* Debug trace */}
                                    {executingRuleId === message.rule_id && (
                                        <div className="hidden">
                                            Debug: Rule {message.rule_id} executing. Context ID: {executingRuleId}, Execution ID: {executionId}
                                        </div>
                                    )}

                                    {executingRuleId === message.rule_id && executionId && (
                                        <div className="ml-11 mt-4">
                                            <ExecutionTimeline
                                                executionId={executionId}
                                                onComplete={() => handleExecutionComplete(message.rule_id)}
                                            />
                                        </div>
                                    )}

                                    {/* View Report button - shows after execution completes */}
                                    {completedRuleIds.has(message.rule_id) && (
                                        <div className="d-flex justify-content-end mt-3 position-relative">
                                            <div className="btn-group">
                                                <button
                                                    className="btn btn-sm btn-outline-info d-flex align-items-center gap-2"
                                                    onClick={() => setShowReportModal(showReportModal === message.rule_id ? null : message.rule_id ?? null)}
                                                >
                                                    <Download size={14} />
                                                    Download Report
                                                </button>
                                            </div>

                                            {/* Download options dropdown */}
                                            {showReportModal === message.rule_id && (
                                                <div
                                                    className="position-absolute bg-dark border rounded shadow-lg p-2"
                                                    style={{ top: '100%', right: 0, zIndex: 1000, minWidth: '180px' }}
                                                >
                                                    <button
                                                        className="btn btn-sm btn-outline-light w-100 mb-1 d-flex align-items-center gap-2"
                                                        onClick={() => handleDownloadReport(message.rule_id!, 'json')}
                                                    >
                                                        <FileJson size={14} />
                                                        View JSON
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-light w-100 mb-1 d-flex align-items-center gap-2"
                                                        onClick={() => handleDownloadReport(message.rule_id!, 'csv')}
                                                    >
                                                        <FileText size={14} />
                                                        Download CSV
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-success w-100 d-flex align-items-center gap-2"
                                                        onClick={() => handleDownloadReport(message.rule_id!, 'excel')}
                                                    >
                                                        <FileSpreadsheet size={14} />
                                                        Download Excel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
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

                    <div className="d-flex gap-2">
                        {/* Upload button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-outline-secondary d-flex align-items-center"
                            title="Upload CSV/Excel with nodes"
                            disabled={loading}
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        {/* Textarea */}
                        <div className="flex-grow-1 position-relative">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="What would you like to automate? (Shift+Enter for new line)"
                                className="w-full px-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                                disabled={loading}
                                rows={2}
                                style={{ minHeight: '60px' }}
                            />
                        </div>

                        {/* Send button */}
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="btn btn-primary d-flex align-items-center"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-600 mt-2">
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
            className="text-left px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all text-sm"
        >
            "{text}"
        </button>
    );
}
