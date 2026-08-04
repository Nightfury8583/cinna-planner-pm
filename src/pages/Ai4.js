import React, { useState, useEffect } from 'react';
import ai4Sessions from '../data/ai4Sessions';
import '../css/Ai4.css';

const STORAGE_KEY = 'ai4_highlighted_sessions';

function getHighlighted() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) { return {}; }
}

function saveHighlighted(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getSessionId(session) {
    return btoa(unescape(encodeURIComponent(
        (session.title + '|' + session.startTime + '|' + session.day).substring(0, 80)
    ))).replace(/[^a-zA-Z0-9]/g, '');
}

function getTimeSlot(timeStr) {
    if (!timeStr) return '00:00';
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return '00:00';
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const slotMinutes = minutes < 30 ? 0 : 30;
    return `${hours.toString().padStart(2, '0')}:${slotMinutes.toString().padStart(2, '0')}`;
}

function formatSlotLabel(slot) {
    const [h, m] = slot.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
}

// Assign colors to tracks
const trackColors = {};
const colorPalette = [
    { bg: '#E3F2FD', border: '#1565C0', text: '#1565C0' },
    { bg: '#E8F5E9', border: '#2E7D32', text: '#2E7D32' },
    { bg: '#FFF3E0', border: '#E65100', text: '#E65100' },
    { bg: '#F3E5F5', border: '#6A1B9A', text: '#6A1B9A' },
    { bg: '#E0F7FA', border: '#00695C', text: '#00695C' },
    { bg: '#FBE9E7', border: '#BF360C', text: '#BF360C' },
    { bg: '#E8EAF6', border: '#283593', text: '#283593' },
    { bg: '#F1F8E9', border: '#33691E', text: '#33691E' },
    { bg: '#FCE4EC', border: '#880E4F', text: '#880E4F' },
    { bg: '#FFFDE7', border: '#F57F17', text: '#F57F17' },
    { bg: '#E0F2F1', border: '#004D40', text: '#004D40' },
    { bg: '#FFF8E1', border: '#FF6F00', text: '#FF6F00' },
    { bg: '#EFEBE9', border: '#3E2723', text: '#3E2723' },
    { bg: '#E1F5FE', border: '#01579B', text: '#01579B' },
    { bg: '#F9FBE7', border: '#827717', text: '#827717' },
    { bg: '#ECEFF1', border: '#37474F', text: '#37474F' },
];

const allTracks = [...new Set(ai4Sessions.map(s => s.track).filter(Boolean))].sort();
allTracks.forEach((track, i) => {
    trackColors[track] = colorPalette[i % colorPalette.length];
});

function Ai4() {
    const [activeDay, setActiveDay] = useState('Tuesday');
    const [highlighted, setHighlighted] = useState(getHighlighted());
    const [collapsed, setCollapsed] = useState({});

    useEffect(() => {
        saveHighlighted(highlighted);
    }, [highlighted]);

    const toggleHighlight = (sessionId) => {
        setHighlighted(prev => {
            const next = { ...prev };
            if (next[sessionId]) {
                delete next[sessionId];
            } else {
                next[sessionId] = true;
            }
            return next;
        });
    };

    const toggleCollapse = (slotKey) => {
        setCollapsed(prev => ({ ...prev, [slotKey]: !prev[slotKey] }));
    };

    // Filter sessions for active day
    const daySessions = ai4Sessions.filter(s => s.day === activeDay);

    // Group by time slot
    const slotGroups = {};
    daySessions.forEach(session => {
        const slot = getTimeSlot(session.startTime);
        if (!slotGroups[slot]) slotGroups[slot] = [];
        slotGroups[slot].push(session);
    });

    const sortedSlots = Object.keys(slotGroups).sort();

    return (
        <div className="ai4-container">
            <div className="ai4-header">
                <h1>Ai4 2026</h1>
                <p>August 5–7 • The Venetian, Las Vegas</p>
                <div className="ai4-tabs">
                    {['Tuesday', 'Wednesday', 'Thursday'].map(day => (
                        <button
                            key={day}
                            className={`ai4-tab ${activeDay === day ? 'active' : ''}`}
                            onClick={() => setActiveDay(day)}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ai4-schedule">
                {sortedSlots.map(slot => {
                    const sessions = slotGroups[slot];
                    const hasSelection = sessions.some(s => highlighted[getSessionId(s)]);

                    return (
                        <div key={slot} className={`ai4-time-slot ${hasSelection ? 'has-selection' : ''}`}>
                            <div className="ai4-slot-header" onClick={() => toggleCollapse(activeDay + slot)}>
                                <span>🕐 {formatSlotLabel(slot)} ({sessions.length} session{sessions.length !== 1 ? 's' : ''})</span>
                                <span className="ai4-collapse-icon">{collapsed[activeDay + slot] ? '▶' : '▼'}</span>
                            </div>
                            {!collapsed[activeDay + slot] && (
                            <div className="ai4-sessions-grid">
                                {sessions.map((session, idx) => {
                                    const sessionId = getSessionId(session);
                                    const isHighlighted = !!highlighted[sessionId];
                                    const colors = trackColors[session.track] || { bg: '#f5f5f5', border: '#999', text: '#666' };

                                    return (
                                        <div
                                            key={idx}
                                            className={`ai4-session-card ${isHighlighted ? 'highlighted' : ''}`}
                                            style={{
                                                borderLeftColor: isHighlighted ? '#00c853' : colors.border,
                                                background: isHighlighted ? '#e8f5e9' : colors.bg
                                            }}
                                            onClick={() => toggleHighlight(sessionId)}
                                        >
                                            {session.track && (
                                                <span
                                                    className="ai4-track-badge"
                                                    style={{ color: colors.text, background: colors.border + '20' }}
                                                >
                                                    {session.track}
                                                </span>
                                            )}
                                            <div className="ai4-session-title">{session.title}</div>
                                            <div className="ai4-session-meta">
                                                🕐 {session.startTime} – {session.endTime}
                                                {session.location && <> &nbsp;📍 {session.location}</>}
                                            </div>
                                            {session.description && (
                                                <div className="ai4-session-desc">{session.description}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Ai4;
