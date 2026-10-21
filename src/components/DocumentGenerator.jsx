import { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import { saveDocument, getDocumentsForFirm, deleteDocument } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import UpgradePrompt from './UpgradePrompt';

const TABS = [
  { key: 'cover_letter', label: 'Cover Letter' },
  { key: 'cold_outreach', label: 'Cold Outreach' },
  { key: 'follow_up', label: 'Follow-Up' },
  { key: 'thank_you', label: 'Thank You' },
  { key: 'interview_prep', label: 'Interview Prep' },
];

// AI generation runs on the server (api/ai.js). The kind matches the tab key. Returns { content, error }.
async function generateDoc(kind, userProfile, firm) {
  try {
    const { content } = await api('/ai/document', { method: 'POST', body: { kind, profile: userProfile, firm } });
    return { content: content || null, error: null };
  } catch (error) {
    const message = error instanceof ApiError ? error.message : (error?.message || 'Request failed');
    return { content: null, error: message };
  }
}

export default function DocumentGenerator({ userProfile, firm, userFirmId, isPro }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cover_letter');
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!user || !firm) return;
    async function loadDocs() {
      const { data } = await getDocumentsForFirm(user.id, firm.id);
      if (data) setDocs(data);
    }
    loadDocs();
  }, [user, firm]);

  const currentTab = TABS.find((t) => t.key === activeTab);

  async function handleGenerate() {
    if (!currentTab) return;
    setGenerating(true);
    setContent('');
    setSaved(false);
    const { content: text, error } = await generateDoc(currentTab.key, userProfile, firm);
    if (error) {
      setContent('Unable to generate document. Please try again.');
    } else {
      setContent(text || '');
    }
    setGenerating(false);
  }

  async function handleSave() {
    if (!user || !content) return;
    const { data } = await saveDocument(user.id, firm.id, activeTab, content);
    if (data) {
      setDocs((prev) => [data, ...prev]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
  }

  function handleViewDoc(doc) {
    setActiveTab(doc.type);
    setContent(doc.content);
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0,
          borderBottom: '1px solid #E3E6E8',
          marginBottom: 16,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setContent(''); setSaved(false); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #1F5C45' : '2px solid transparent',
              padding: '8px 12px',
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: activeTab === tab.key ? '#1F5C45' : '#5B6470',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {!isPro ? (
        <UpgradePrompt />
      ) : (
        <>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '8px 20px',
              backgroundColor: '#14181F',
              color: '#1F5C45',
              border: 'none',
              borderRadius: 2,
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: generating ? 'default' : 'pointer',
              opacity: generating ? 0.6 : 1,
              marginBottom: 12,
            }}
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>

          {generating && (
            <p
              className="doc-gen-pulse"
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 15,
                fontStyle: 'italic',
                color: '#5B6470',
              }}
            >
              Composing...
            </p>
          )}

          {content && !generating && (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 200,
                  padding: '1rem',
                  background: '#FFFFFF',
                  border: '1px solid #E3E6E8',
                  borderRadius: 2,
                  fontFamily: "'EB Garamond', Georgia, serif",
                  fontSize: 15,
                  color: '#14181F',
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <SmallBtn onClick={handleGenerate}>Regenerate</SmallBtn>
                <SmallBtn onClick={handleCopy}>Copy to Clipboard</SmallBtn>
                <SmallBtn onClick={handleSave}>{saved ? 'Saved' : 'Save'}</SmallBtn>
              </div>
            </>
          )}
        </>
      )}

      {/* Previously Generated */}
      {docs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#5B6470',
              marginBottom: 8,
            }}
          >
            Previously Generated
          </div>
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid #E3E6E8',
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  textTransform: 'uppercase',
                  color: '#5B6470',
                }}
              >
                {doc.type.replace(/_/g, ' ')}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  color: '#5B6470',
                }}
              >
                {new Date(doc.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => handleViewDoc(doc)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  textTransform: 'uppercase',
                  color: '#1F5C45',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .doc-gen-pulse {
          animation: docPulse 1.5s ease-in-out infinite;
        }
        @keyframes docPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function SmallBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        background: 'transparent',
        border: '1px solid #E3E6E8',
        borderRadius: 2,
        fontFamily: "'DM Mono', monospace",
        fontSize: 9,
        textTransform: 'uppercase',
        color: '#5B6470',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
