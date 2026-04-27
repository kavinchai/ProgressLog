import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './ClaudeSetup.css';

const MCP_URL = 'https://progresslog-mcp.up.railway.app/mcp';

export default function ClaudeSetup() {
  const navigate = useNavigate();

  const [apiKey,          setApiKey]          = useState(null);
  const [apiKeyLoading,   setApiKeyLoading]   = useState(true);
  const [apiKeyGenerating,setApiKeyGenerating]= useState(false);
  const [copied,          setCopied]          = useState(null); // 'key' | 'url' | null

  useEffect(() => {
    api.get('/auth/api-key')
      .then(res => setApiKey(res.data.apiKey ?? null))
      .catch(() => {})
      .finally(() => setApiKeyLoading(false));
  }, []);

  async function handleGenerate() {
    setApiKeyGenerating(true);
    try {
      const res = await api.post('/auth/api-key');
      setApiKey(res.data.apiKey);
    } catch { /* ignore */ }
    finally { setApiKeyGenerating(false); }
  }

  function copy(text, which) {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  const mcpUrl = apiKey ? `${MCP_URL}?apiKey=${apiKey}` : null;

  return (
    <div className="claude-setup-page">
      <button className="btn btn-sm claude-setup-back" onClick={() => navigate('/settings')}>
        ← Back to Settings
      </button>

      <div className="claude-setup-header">
        <h1 className="claude-setup-title">Claude Integration</h1>
        <p className="claude-setup-sub">Log workouts, meals, steps and more by chatting with Claude</p>
      </div>

      {/* What you can do */}
      <div className="claude-setup-card">
        <h2 className="claude-setup-section-title">What you can do</h2>
        <p className="claude-setup-p">Once connected, just talk to Claude naturally:</p>
        <ul className="claude-setup-list">
          <li>"Log 185 lb bench press, 5 sets of 5"</li>
          <li>"I ran 3 miles in 28 minutes today"</li>
          <li>"Add breakfast: 600 calories, 40g protein"</li>
          <li>"Log my weight as 178 lbs"</li>
          <li>"I walked 9,200 steps today"</li>
          <li>"What did I log today?"</li>
          <li>"Show me my personal records"</li>
        </ul>
      </div>

      {/* Step 1: API Key */}
      <div className="claude-setup-card">
        <div className="claude-setup-step-num">Step 1</div>
        <h2 className="claude-setup-section-title">Get your MCP URL</h2>
        <p className="claude-setup-p">
          Generate an API key to create your personal MCP URL. Keep it secret — it gives full access to your account data.
        </p>

        {apiKeyLoading ? (
          <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Loading…</span>
        ) : apiKey ? (
          <div className="claude-setup-key-section">
            <div className="claude-setup-field-label">API Key</div>
            <div className="claude-setup-copy-row">
              <code className="claude-setup-value">{apiKey}</code>
              <button className="btn btn-sm" onClick={() => copy(apiKey, 'key')}>
                {copied === 'key' ? 'Copied!' : 'Copy'}
              </button>
              <button className="btn btn-sm" onClick={handleGenerate} disabled={apiKeyGenerating}>
                Regenerate
              </button>
            </div>

            <div className="claude-setup-field-label" style={{ marginTop: 12 }}>Your MCP URL</div>
            <div className="claude-setup-copy-row">
              <code className="claude-setup-value">{mcpUrl}</code>
              <button className="btn btn-sm btn-primary" onClick={() => copy(mcpUrl, 'url')}>
                {copied === 'url' ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
            <p className="claude-setup-hint">Copy this URL — you'll paste it into Claude in the next step.</p>
          </div>
        ) : (
          <button className="btn btn-sm btn-primary" onClick={handleGenerate} disabled={apiKeyGenerating}>
            {apiKeyGenerating ? 'Generating…' : 'Generate API Key'}
          </button>
        )}
      </div>

      {/* Step 2a: Claude.ai */}
      <div className="claude-setup-card">
        <div className="claude-setup-step-num">Step 2 — Option A (Easiest)</div>
        <h2 className="claude-setup-section-title">Claude.ai — Web</h2>
        <p className="claude-setup-p">No software to install. Works directly in your browser.</p>
        <ol className="claude-setup-ol">
          <li>Go to <strong>claude.ai</strong> and open <strong>Settings → Connectors</strong></li>
          <li>Click <strong>Add custom connector</strong></li>
          <li>Give it a name like <strong>ProgressLog</strong></li>
          <li>Paste your MCP URL from Step 1 as the connector URL</li>
          <li>Save — the tools will be available in new conversations</li>
        </ol>
      </div>

      {/* Step 2b: Claude Desktop */}
      <div className="claude-setup-card">
        <div className="claude-setup-step-num">Step 2 — Option B</div>
        <h2 className="claude-setup-section-title">Claude Desktop App</h2>
        <p className="claude-setup-p">For the Mac or Windows desktop app, edit the config file once.</p>
        <ol className="claude-setup-ol">
          <li>
            Open the config file:
            <div className="claude-setup-code">
              <span className="claude-setup-comment">Windows: </span>%APPDATA%\Claude\claude_desktop_config.json<br />
              <span className="claude-setup-comment">Mac: </span>~/Library/Application Support/Claude/claude_desktop_config.json
            </div>
          </li>
          <li>
            Add or merge this block, replacing the URL with your MCP URL from Step 1:
            <pre className="claude-setup-code">{`{
  "mcpServers": {
    "progresslog": {
      "url": "YOUR_MCP_URL_FROM_STEP_1"
    }
  }
}`}</pre>
          </li>
          <li>Save the file and <strong>fully quit and reopen</strong> Claude Desktop</li>
          <li>A hammer icon in new chats confirms the tools are loaded</li>
        </ol>
      </div>

      {/* Step 2c: Claude Code */}
      <div className="claude-setup-card">
        <div className="claude-setup-step-num">Step 2 — Option C</div>
        <h2 className="claude-setup-section-title">Claude Code (CLI)</h2>
        <p className="claude-setup-p">Add the server once with a single command and it's available in all Claude Code sessions.</p>
        <ol className="claude-setup-ol">
          <li>
            Run this in your terminal, replacing the URL with your MCP URL from Step 1:
            <div className="claude-setup-code">claude mcp add progresslog --transport http "YOUR_MCP_URL_FROM_STEP_1"</div>
          </li>
          <li>That's it — the tools are now available globally in Claude Code</li>
          <li>
            Or scope it to one project by adding a <code>.mcp.json</code> file at the project root:
            <pre className="claude-setup-code">{`{
  "mcpServers": {
    "progresslog": {
      "type": "http",
      "url": "YOUR_MCP_URL_FROM_STEP_1"
    }
  }
}`}</pre>
          </li>
        </ol>
      </div>

      {/* Troubleshooting */}
      <div className="claude-setup-card">
        <h2 className="claude-setup-section-title">Troubleshooting</h2>
        <ul className="claude-setup-list">
          <li><strong>Tools not appearing in Desktop:</strong> Make sure you fully quit and reopened Claude Desktop after editing the config</li>
          <li><strong>401 Unauthorized:</strong> Your API key may be invalid — regenerate it above</li>
          <li><strong>Data going to the wrong account:</strong> Each MCP URL is tied to one account — make sure you used your own URL from Step 1</li>
        </ul>
      </div>
    </div>
  );
}
