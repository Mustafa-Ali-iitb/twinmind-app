import React, { useState, useEffect, useRef } from 'react';
import './PastMeetingModal.css';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useUser } from '../context/UserContext';
import { renderSummaryHtml } from '../utils/renderSummary';

const API_BASE = "https://twinmind-backend-fhyd.onrender.com";

function UpcomingMeetingModal({ meeting, onClose, onJoin }) {
  const [activeTab, setActiveTab] = useState('search');
  const [transcript, setTranscript] = useState([]);
  const transcriptRef = useRef([]);
  const [searches, setSearches] = useState([]);
  const [newSearches, setNewSearches] = useState([]);
  const [summary, setSummary] = useState('');
  const [question, setQuestion] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const hasInitializedRef = useRef(false);
  const { user } = useUser();
  const transcriptScrollRef = useRef(null);
  const searchScrollRef = useRef(null);

  const formatTime = (seconds) =>
    seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  const { start, stop } = useAudioRecorder({
    onChunk: async (blob) => {
      const timestamp = elapsedRef.current;
      const formData = new FormData();
      formData.append('file', blob, 'chunk.webm');
      formData.append('meetingId', meeting.id);
      formData.append('timestamp', timestamp);

      try {
        const res = await fetch(`${API_BASE}/meeting/chunk`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.text) {
          setTranscript(prev => {
            const updated = [...prev, { time: timestamp, text: data.text }];
            transcriptRef.current = updated;
            return updated;
          });
        } else {
          console.warn("No transcript returned for chunk.");
        }
      } catch (err) {
        console.error("Error sending chunk:", err);
      }
    },
    onStop: async () => {
      setIsRecording(false);
      const transcriptText = transcriptRef.current.map(t => t.text).join(" ");
      setSummary("Generating the summary...");
      setActiveTab((prevTab) => prevTab !== 'search' ? 'summary' : prevTab);
      try {
        const res = await fetch(`${API_BASE}/generate-structured-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: transcriptText,
            uid: user.uid,
            meetingId: meeting.id
          })
        });
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);          
        } else {
          console.warn("No summary returned");
        }
      } catch (err) {
        console.error("Error generating summary:", err);
      }
    },
    onStart: () => {
      setIsRecording(true);
    }
  });

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    const newEntry = {
      question,
      answer: '',
      datetimeStamp: new Date().toISOString(),
    };

    const questionIndex = searches.length;
    setSearches(prev => [...prev, newEntry]);
    setQuestion('');

    try {
      const res = await fetch(`${API_BASE}/search-in-transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          transcript: transcriptRef.current.map(t => t.text),
        })
      });
      const data = await res.json();
      if (data.answer) {
        setSearches(prev => {
          const updated = [...prev];
          updated[questionIndex] = { ...updated[questionIndex], answer: data.answer };
          return updated;
        });
        setNewSearches(prev => [...prev, { ...newEntry, answer: data.answer }]);
      }
    } catch (err) {
      console.error("❌ Failed to get answer from transcript:", err);
    }
  };

  const handleClose = async () => {
    if (newSearches.length > 0) {
      try {
        await fetch(`${API_BASE}/meetings/searches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            meetingId: meeting.id,
            searches: newSearches
          })
        });
        console.log("🔍 Saved new searches to DB");
      } catch (err) {
        console.error("❌ Failed to save searches:", err);
      }
    }
    onClose();
    hasInitializedRef.current = false;
  };

  const handleRecord = async () => {
    if (!isRecording) {
      if (!hasInitializedRef.current) {
        try {
          const res = await fetch(`${API_BASE}/meetings/init`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meetingId: meeting.id,
              meetingName: meeting.summary,
              uid: user.uid,
              meetingStartTime: meeting.start.dateTime,
              meetingEndTime: meeting.end.dateTime,
              meetingDescription: meeting.description || '',
              createdAt: new Date().toISOString()
            })
          });
          const data = await res.json();
          console.log("✅ Meeting initialized:", data);
          hasInitializedRef.current = true;
        } catch (err) {
          console.error("❌ Meeting init failed:", err);
        }
      }
      const mode = meeting.hangoutLink ? 'tab' : 'mic';
      start(mode);
    } else {
      stop();
    }
  };

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!meeting?.id || !user?.uid) return;
      try {
        const check = await fetch(`${API_BASE}/meetings/find?uid=${user.uid}&meetingId=${meeting.id}`);
        const result = await check.json();
        if (result.found) {
          console.log("💾 Meeting loaded from DB:", result.meeting);
          setTranscript(result.meeting.meetingTranscription || []);
          transcriptRef.current = result.meeting.meetingTranscription || [];
          setSummary(result.meeting.meetingSummary || '');
          setSearches(result.meeting.meetingSearches || []);
          const lastTime = Math.max(...(result.meeting.meetingTranscription?.map(t => t.time) || [0]));
          elapsedRef.current = lastTime + 10;
          setElapsed(lastTime + 10);
          hasInitializedRef.current = true;
          setActiveTab('summary');
        } else {
          hasInitializedRef.current = false;
          setActiveTab('transcript');
        }
      } catch (err) {
        console.error("❌ Error checking meeting DB:", err);
      }
    };
    fetchMeetingData();
  }, [meeting.id, user.uid]);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  useEffect(() => {
    if (searchScrollRef.current) {
      searchScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searches]);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setElapsed((e) => {
          elapsedRef.current = e + 1;
          return e + 1;
        });
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>{meeting.summary || "Untitled Meeting"}</h2>
        <div className="tabs">
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>Search</button>
          <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>Summary</button>
          <button className={activeTab === 'transcript' ? 'active' : ''} onClick={() => setActiveTab('transcript')}>Transcript</button>
        </div>

        <div className="tab-content">
          {activeTab === 'search' && (
            <div>
              <div className="chat-box">
                {searches.map((entry, idx) => (
                  <div key={idx} ref={idx === searches.length - 1 ? searchScrollRef : null} className="chat-card">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskQuestion();
                  }}
                  placeholder="Ask something about this meeting..."
                />
                <button onClick={handleAskQuestion}>Ask</button>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="summary-text">
              {renderSummaryHtml(summary) || 'No summary generated yet.'}
            </div>
          )}

          {activeTab === 'transcript' && (
            transcript.length === 0 ? (
              <p className="summary-text">No transcript yet. Click Record to begin.</p>
            ) : (
              <div className="transcript-list">
                {transcript.map((line, i) => (
                  <div key={i} ref={i === transcript.length - 1 ? transcriptScrollRef : null} className="transcript-card">
                    <div className="timestamp">[{formatTime(line.time)}]</div>
                    <div>{line.text || <span className="typing">...</span>}</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="control-row">
          {meeting.hangoutLink && (
            <button onClick={() => onJoin(meeting.hangoutLink)} className="upcoming-modal-btn btn-join">
              Join Meeting
            </button>
          )}
          <button onClick={handleRecord} className="upcoming-modal-btn btn-record">
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <button disabled={isRecording} className="upcoming-modal-btn btn-close" onClick={handleClose}>
            Close
          </button>
        </div>

        {isRecording && (
          <div className="recording-status">
            Recording... {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </div>
        )}
      </div>
    </div>
  );
}

export default UpcomingMeetingModal;
