import React, { useState, useRef, useEffect } from 'react';
import './PastMeetingModal.css';
import { renderSummaryHtml } from '../utils/renderSummary';

const BACKEND_URL = "https://twinmind-backend.onrender.com";
function PastMeetingModal({ meeting, onClose, onSaveSearches }) {
  const [activeTab, setActiveTab] = useState('search');
  const [question, setQuestion] = useState('');
  const [searches, setSearches] = useState(meeting.meetingSearches || []);
  const [transcript, setTranscript] = useState(meeting.meetingTranscription || []);
  const [summary, setSummary] = useState(meeting.meetingSummary || '');
  const [newSearches, setNewSearches] = useState([]);
  const transcriptRef = useRef(transcript);
  const scrollRef = useRef(null);

  const formatTime = (seconds) =>
    seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  useEffect(() => {
    setSearches(meeting.meetingSearches || []);
    setTranscript(meeting.meetingTranscription || []);
    setSummary(meeting.meetingSummary || '');
    transcriptRef.current = meeting.meetingTranscription || [];
  }, [meeting]);

  // Auto scroll when a new question is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searches]);

  const handleAsk = async () => {
    if (!question.trim()) return;

    const entry = {
      question,
      answer: '',
      datetimeStamp: new Date().toISOString(),
    };

    const index = searches.length;

    // Optimistically update UI
    setSearches(prev => [...prev, entry]);
    setQuestion('');

    try {
      const res = await fetch(`${BACKEND_URL}/search-in-transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          transcript: transcriptRef.current.map(t => t.text),
        }),
      });

      const data = await res.json();
      if (data.answer) {
        const updated = { ...entry, answer: data.answer };
        setSearches(prev => {
          const copy = [...prev];
          copy[index] = updated;
          return copy;
        });
        setNewSearches(prev => [...prev, updated]);
      }
    } catch (err) {
      console.error("❌ Failed to get answer from transcript:", err);
    }
  };

  const handleClose = () => {
    if (newSearches.length > 0) {
      onSaveSearches(meeting, newSearches);
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>{meeting.meetingName}</h2>

        {/* Tabs */}
        <div className="tabs">
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>Search</button>
          <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>Summary</button>
          <button className={activeTab === 'transcript' ? 'active' : ''} onClick={() => setActiveTab('transcript')}>Transcript</button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">

          {/* 🔍 Search Tab */}
          {activeTab === 'search' && (
            <div>
              <div className="chat-box">
                {searches.map((entry, idx) => (
                  <div
                    key={idx}
                    ref={idx === searches.length - 1 ? scrollRef : null}
                    className="chat-card"
                  >
                    <p><strong>Q:</strong> {entry.question}</p>
                    <p><strong>A:</strong> {entry.answer || <span className="typing"></span>}</p>
                  </div>
                ))}
              </div>
              <div className="search-bar">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="Ask something about this meeting..."
                />
                <button onClick={handleAsk}>Ask</button>
              </div>
            </div>
          )}

          {/* 📝 Summary Tab */}
          {activeTab === 'summary' && (
            <div className="summary-text">
              {renderSummaryHtml(summary) || 'No summary available.'}
            </div>
          )}

          {/* 📃 Transcript Tab */}
          {activeTab === 'transcript' && (
            <div className="transcript-list">
              {transcript.map((line, i) => (
                <div key={i} className="transcript-card">
                  <div className="timestamp">[{formatTime(line.time)}]</div>
                  <div>{line.text || <span className="typing">...</span>}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="close-btn" onClick={handleClose}>Close</button>
      </div>
    </div>
  );
}

export default PastMeetingModal;
