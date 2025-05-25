import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import './Dashboard.css';
import PastMeetingModal from './PastMeetingModal';
import UpcomingMeetingModal from './UpcomingMeetingModal';

const BACKEND_URL = "http://localhost:8000";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function Dashboard() {
  const { user, logout } = useUser();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [pastMeetings, setPastMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const firstName = user?.name?.split(' ')[0] || '';
  const EVENTS_PER_PAGE = 5;
  const PAST_PER_PAGE = 5;

  function groupEventsByDate(events) {
    return events.reduce((acc, event) => {
      const date = new Date(event.start.dateTime || event.start.date).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {});
  }

  function flattenGroupedEvents(grouped) {
    return Object.entries(grouped).flatMap(([date, events]) =>
      events.map(event => ({ date, event }))
    );
  }

  function groupMeetingsByDate(meetings) {
    return meetings.reduce((acc, meeting) => {
      const date = new Date(meeting.meetingStartTime).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(meeting);
      return acc;
    }, {});
  }

  function flattenPastMeetings(meetings) {
    const grouped = groupMeetingsByDate(meetings);
    return Object.entries(grouped).flatMap(([date, dayMeetings]) =>
      dayMeetings.map(meeting => ({ date, meeting }))
    );
  }

  const handleSaveSearches = async (meeting, newSearches) => {
    if (newSearches.length === 0) return;
    try {
      const response = await fetch(`${BACKEND_URL}/meetings/searches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          meetingId: meeting.meetingId,
          searches: newSearches
        })
      });
      const data = await response.json();
      console.log('✅ Saved searches to DB:', data);

      const res = await fetch(`${BACKEND_URL}/meetings/past?uid=${user.uid}`);
      const updated_data = await res.json();
      setPastMeetings(updated_data.meetings || []);
    } catch (error) {
      console.error('❌ Failed to save searches:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔁 Fetch upcoming meetings from Google Calendar with pagination
  useEffect(() => {
    const fetchEvents = async () => {
      let allEvents = [];
      let pageToken = '';
      try {
        while (true) {
          const res = await fetch(
            `${GOOGLE_CALENDAR_API}?maxResults=10&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}${pageToken ? `&pageToken=${pageToken}` : ''}`,
            {
              headers: {
                Authorization: `Bearer ${user.accessToken}`,
              },
            }
          );
          const data = await res.json();
          allEvents = [...allEvents, ...(data.items || [])];
          if (data.nextPageToken) {
            pageToken = data.nextPageToken;
          } else {
            break;
          }
        }
        setEvents(allEvents);
      } catch (err) {
        console.error("❌ Failed to fetch calendar events:", err);
      }
    };

    if (user?.accessToken && activeTab === 'upcoming') {
      fetchEvents();
    }
  }, [user, activeTab]);

  // 🔁 Fetch past meetings from DB
  useEffect(() => {
    const fetchPastMeetings = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/meetings/past?uid=${user.uid}`);
        const data = await res.json();
        setPastMeetings(data.meetings || []);
      } catch (err) {
        console.error("❌ Failed to fetch past meetings:", err);
      }
    };

    if (activeTab === 'past') {
      fetchPastMeetings();
    }
  }, [activeTab, user.uid]);

  const filteredEvents = events.filter(event => {
    const query = searchTerm.toLowerCase();
    return (
      (event.summary || '').toLowerCase().includes(query) ||
      (event.description || '').toLowerCase().includes(query) ||
      (event.location || '').toLowerCase().includes(query)
    );
  });

  const filteredPastMeetings = pastMeetings.filter(meeting => {
    const query = searchTerm.toLowerCase();
    return (
      (meeting.meetingName || '').toLowerCase().includes(query) ||
      (meeting.meetingSummary || '').toLowerCase().includes(query) ||
      (meeting.meetingDescription || '').toLowerCase().includes(query)
    );
  });

  const grouped = groupEventsByDate(filteredEvents);
  const flattened = flattenGroupedEvents(grouped);
  const totalPages = Math.ceil(flattened.length / EVENTS_PER_PAGE);
  const paginated = flattened.slice((currentPage - 1) * EVENTS_PER_PAGE, currentPage * EVENTS_PER_PAGE);

  const flatPastMeetings = flattenPastMeetings(filteredPastMeetings);
  const totalPastPages = Math.ceil(flatPastMeetings.length / PAST_PER_PAGE);
  const paginatedPast = flatPastMeetings.slice((pastPage - 1) * PAST_PER_PAGE, pastPage * PAST_PER_PAGE);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">Welcome, {firstName}</div>
        <div className="header-center">
          <img src="/images/logo_dashboard.png" alt="TwinMind Logo" className="logo-img-dashboard" />
        </div>
        <div className="header-right">
          <div className="user-dropdown" ref={menuRef}>
            <img
              src={user.picture}
              alt="User"
              className="user-avatar"
              onClick={() => setShowMenu(!showMenu)}
            />
            {showMenu && (
              <div className="dropdown-menu">
                <p><strong>{user.name}</strong></p>
                <p>{user.email}</p>
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs and global search */}
      <div className="tabs tabs-with-search">
        <div className="tab-buttons">
            <button className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
            Upcoming Meetings
            </button>
            <button className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}>
            Past Meetings
            </button>
        </div>

        <div className="tab-search">
            <input
            className="utility-search"
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>


      {/* Upcoming Meetings */}
      {activeTab === 'upcoming' && (
        <>
          <div className="meeting-list">
            {paginated.map((item, index) => {
              const { date, event } = item;
              const start = new Date(event.start.dateTime || event.start.date);
              const end = new Date(event.end?.dateTime || event.end?.date);
              const durationMin = Math.round((end - start) / (1000 * 60));
              const showDateLabel = index === 0 || paginated[index - 1].date !== date;

              return (
                <div key={event.id + index}>
                  {showDateLabel && <div className="meeting-date-label">{date}</div>}

                  <div className="meeting-card updated" onClick={() => {
                        setSelectedMeeting(event);
                        setShowUpcomingModal(true);
                        }}>
                    <div className="meeting-info">
                      <h3 className="meeting-title">{event.summary || "Untitled Meeting"}</h3>
                      <p className="meeting-summary">{event.description || "No additional details provided."}</p>
                      {event.location && <p className="meeting-location">📍 {event.location}</p>}
                      <div className="meeting-time">
                        <p>
                          🕒 {start.toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short'
                          })} - {end.toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short'
                          })} • {Math.floor(durationMin / 60)}h {durationMin % 60}m
                        </p>
                      </div>
                    </div>
                    <div className="meeting-action">
                    <button
                        className="join-btn"
                        onClick={() => {
                        setSelectedMeeting(event);
                        setShowUpcomingModal(true);
                        }}
                    >
                        View Details
                    </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>⬅ Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next ➡</button>
          </div>
        </>
      )}

      {/* Past Meetings */}
      {activeTab === 'past' && (
        <>
          <div className="meeting-list">
            {paginatedPast.map((item, i) => {
              const { date, meeting } = item;
              const showDateLabel = i === 0 || paginatedPast[i - 1].date !== date;
              return (
                <div key={meeting.meetingName + i}>
                  {showDateLabel && <div className="meeting-date-label">{date}</div>}
                  <div className="meeting-card updated" onClick={() => { setSelectedMeeting(meeting); setShowModal(true); }}>
                    <div className="meeting-info">
                      <h3 className="meeting-title">{meeting.meetingName}</h3>
                      <div className="meeting-time">
                        🕒 {new Date(meeting.meetingStartTime).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="meeting-action">
                      <button className="join-btn">View Summary</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pagination">
            <button disabled={pastPage === 1} onClick={() => setPastPage(p => p - 1)}>⬅ Previous</button>
            <span>Page {pastPage} of {totalPastPages}</span>
            <button disabled={pastPage === totalPastPages} onClick={() => setPastPage(p => p + 1)}>Next ➡</button>
          </div>
        </>
      )}

        {showModal && selectedMeeting && (
            <PastMeetingModal
            meeting={selectedMeeting}
            onClose={() => setShowModal(false)}
            onSaveSearches={handleSaveSearches}
            />
        )}

        {showUpcomingModal && selectedMeeting && (
            <UpcomingMeetingModal
            meeting={selectedMeeting}
            onClose={() => setShowUpcomingModal(false)}
            onJoin={(url) => window.open(url, '_blank')}
            onStartRecording={(config) => {
                console.log('Recording config:', config);
            }}
            />
        )}
      
    </div>
  );
}

export default Dashboard;
