import { useState, useEffect } from 'react';
import {
  generateCoverLetter,
  generateColdOutreach,
  generateFollowUp,
  generateThankYou,
  generateInterviewPrep,
} from '../lib/ai';
import { saveDocument, getDocumentsForFirm, deleteDocument } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import UpgradePrompt from './UpgradePrompt';

const TABS = [
  { key: 'cover_letter', label: 'Cover Letter', gen: generateCoverLetter },
  { key: 'cold_outreach', label: 'Cold Outreach', gen: generateColdOutreach },
  { key: 'follow_up', label: 'Follow-Up', gen: generateFollowUp },
  { key: 'thank_you', label: 'Thank You', gen: generateThankYou },
  { key: 'interview_prep', label: 'Interview Prep', gen: generateInterviewPrep },
];

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
    const { content: text, error } = await currentTab.gen(userProfile, firm);
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
          borderBottom: '1px solid #e4ddd1',
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
              borderBottom: activeTab === tab.key ? '2px solid #8b6914' : '2px solid transparent',
              padding: '8px 12px',
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: activeTab === tab.key ? '#8b6914' : '#b0a898',
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
              backgroundColor: '#1a1710',
              color: '#c4a55a',
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
                color: '#7a7260',
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
                  background: '#faf7f2',
                  border: '1px solid #c8bfae',
                  borderRadius: 2,
                  fontFamily: "'EB Garamond', Georgia, serif",
                  fontSize: 15,
                  color: '#1a1710',
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
              color: '#b0a898',
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
                borderBottom: '1px solid #e4ddd1',
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  textTransform: 'uppercase',
                  color: '#7a7260',
                }}
              >
                {doc.type.replace(/_/g, ' ')}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  color: '#b0a898',
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
                  color: '#8b6914',
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
        border: '1px solid #c8bfae',
        borderRadius: 2,
        fontFamily: "'DM Mono', monospace",
        fontSize: 9,
        textTransform: 'uppercase',
        color: '#7a7260',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
