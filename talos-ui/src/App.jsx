import { useState } from 'react';
import axios from 'axios';
import { Terminal, Play, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';

export default function App() {
  const [command, setCommand] = useState('df -h');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Connect to our Python API
      const response = await axios.post('http://localhost:8000/run', {
        command: command,
        target_host: "192.168.2.5" // Updated to match backend configuration
      });
      setResult(response.data);
    } catch (err) {
      setError("Failed to connect to Agent API. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HEADER */}
        <header className="flex items-center gap-3 border-b border-slate-700 pb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Talos Automation Agent</h1>
        </header>

        {/* INPUT SECTION */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <label className="block text-sm font-medium text-slate-400 mb-2">Run Command</label>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Terminal className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
              />
            </div>
            <button
              onClick={handleRun}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all"
            >
              {loading ? 'Running...' : <><Play className="w-4 h-4" /> Run</>}
            </button>
          </div>
          {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
        </div>

        {/* RESULTS SECTION */}
        {result && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* LEFT: AI ANALYSIS */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                ✨ AI Analysis
              </h2>
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-700">
                  {result.ai_analysis?.resources?.map((resource, idx) => (
                    <div key={idx} className="p-4 flex items-start gap-3 hover:bg-slate-700/30 transition-colors">
                      {/* Icon based on status */}
                      <div className="mt-1">
                        {resource.status === 'OK' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                        {resource.status === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                        {resource.status === 'CRITICAL' && <XCircle className="w-5 h-5 text-red-500" />}
                        {resource.status === 'UNKNOWN' && <Activity className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-200">{resource.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold
                            ${resource.status === 'OK' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                            ${resource.status === 'WARNING' ? 'bg-amber-500/10 text-amber-400' : ''}
                            ${resource.status === 'CRITICAL' ? 'bg-red-500/10 text-red-400' : ''}
                          `}>
                            {resource.status}
                          </span>
                        </div>
                        {resource.reasoning && <p className="text-sm text-slate-400 mt-1">{resource.reasoning}</p>}
                        {resource.metric_value && (
                          <p className="text-xs text-slate-500 mt-2 font-mono bg-slate-900/50 inline-block px-2 py-1 rounded">
                            Metric: {resource.metric_value}
                          </p>
                        )}
                        {resource.value && (
                          <p className="text-xs text-slate-500 mt-2 font-mono bg-slate-900/50 inline-block px-2 py-1 rounded">
                            Value: {typeof resource.value === 'object' ? JSON.stringify(resource.value) : resource.value}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: RAW OUTPUT */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-400 flex items-center gap-2">
                <Terminal className="w-5 h-5" /> Raw Output
              </h2>
              <div className="bg-black rounded-xl border border-slate-700 p-4 h-[400px] overflow-auto shadow-inner">
                <pre className="text-xs font-mono text-emerald-500 whitespace-pre-wrap">
                  {result.raw_output}
                </pre>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}