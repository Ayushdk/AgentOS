"use client";
import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Users,
  Info,
  RefreshCw,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type CalendarData, type Identity, type Leave, type HolidayItem } from "@/lib/api";
import {
  MONTH_NAMES,
  WEEKDAYS,
  toLocalDateString,
  parseDateOnly,
  formatDisplayDate,
  generateCalendarCells,
} from "@/lib/dates";

interface CalendarViewProps {
  person: Identity;
  onNavigateLeave?: () => void;
}

export function CalendarView({ person, onNavigateLeave }: CalendarViewProps) {
  // Runtime local current date initialization (never hardcoded)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(() => {
    return toLocalDateString(new Date());
  });
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<"all" | "holidays" | "leaves" | "team">("all");

  const loadCalendar = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<CalendarData>("/calendar");
      setCalendarData(data);
    } catch (e) {
      setError((e as Error).message || "Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(toLocalDateString(now));
  };

  // Generate complete grid with leap-year and boundary protection
  const todayStr = toLocalDateString(new Date());
  const cells = generateCalendarCells(year, month, todayStr);

  // Match items for a given date
  const getItemsForDate = (dateStr: string) => {
    if (!calendarData) return { holidays: [], leaves: [], events: [], teamLeaves: [] };

    const holidays = calendarData.holidays.filter((h) => h.date === dateStr);
    const leaves = calendarData.leaves.filter((l) => {
      return dateStr >= l.start_date && dateStr <= l.end_date;
    });
    const events = calendarData.events.filter((e) => {
      const eDate = e.starts_at.slice(0, 10);
      return eDate === dateStr;
    });
    const teamLeaves = (calendarData.team_leaves || []).filter((l) => {
      return dateStr >= l.start_date && dateStr <= l.end_date;
    });

    return { holidays, leaves, events, teamLeaves };
  };

  // Selected date details
  const selectedDetails = selectedDateStr ? getItemsForDate(selectedDateStr) : null;
  const isSelectedDateAWeekend = selectedDateStr
    ? parseDateOnly(selectedDateStr).isWeekend
    : false;

  const isManager = person.role === "manager";

  return (
    <div className="calendar-page-container">
      {/* Top Header & Month Controls */}
      <div className="calendar-header-bar">
        <div className="calendar-title-group">
          <div className="calendar-badge">
            {isManager ? <Users size={16} /> : <CalendarDays size={16} />}
            <span>{isManager ? "Team & Corporate Calendar" : "Corporate & Personal Calendar"}</span>
          </div>
          <h1 className="calendar-heading">
            {MONTH_NAMES[month]} {year}
          </h1>
          <p className="calendar-subtext">
            {isManager
              ? "Direct report leave requests, authorized company holidays, and team availability (Asia/Kolkata)."
              : "Official company holidays, personal time-off requests, and work schedule (Asia/Kolkata)."}
          </p>
        </div>

        <div className="calendar-controls">
          <div className="calendar-filter-group">
            <button
              type="button"
              className={`filter-btn ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === "holidays" ? "active" : ""}`}
              onClick={() => setFilterType("holidays")}
            >
              Holidays
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === "leaves" ? "active" : ""}`}
              onClick={() => setFilterType("leaves")}
            >
              My Leaves
            </button>
            {isManager && (
              <button
                type="button"
                className={`filter-btn ${filterType === "team" ? "active" : ""}`}
                onClick={() => setFilterType("team")}
              >
                Team Leaves
              </button>
            )}
          </div>

          <div className="calendar-nav-buttons">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="today-btn"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="banner error mb-4" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadCalendar}>
            <RefreshCw size={14} className="mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Main Calendar View Split: Grid on Left, Day Inspector on Right */}
      <div className="calendar-layout-split">
        {/* Calendar Grid Container */}
        <div className="calendar-grid-card">
          {/* Weekday Header */}
          <div className="calendar-weekdays-row">
            {WEEKDAYS.map((day) => (
              <div key={day} className="weekday-header-cell">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Cells Grid */}
          <div className="calendar-days-grid">
            {cells.map((cell, idx) => {
              const { holidays, leaves, events, teamLeaves } = getItemsForDate(cell.dateStr);

              const hasHoliday = holidays.length > 0;
              const hasLeave = leaves.length > 0;
              const hasEvent = events.length > 0;
              const hasTeamLeave = teamLeaves.length > 0;

              // Filter check
              const showHoliday = hasHoliday && (filterType === "all" || filterType === "holidays");
              const showLeave = hasLeave && (filterType === "all" || filterType === "leaves");
              const showTeam = hasTeamLeave && (filterType === "all" || filterType === "team");
              const showEvent = hasEvent && filterType === "all";

              const isSelected = selectedDateStr === cell.dateStr;

              return (
                <div
                  key={idx}
                  className={`calendar-day-cell ${
                    cell.isCurrentMonth ? "in-month" : "out-of-month"
                  } ${cell.isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${cell.dateStr}${cell.isToday ? " (Today)" : ""}${
                    hasHoliday ? ` - Holiday: ${holidays[0].title}` : ""
                  }`}
                >
                  <div className="cell-top-bar">
                    <span className="day-number">{cell.dayNumber}</span>
                    {cell.isToday && <span className="today-indicator">Today</span>}
                  </div>

                  <div className="cell-events-list">
                    {showHoliday &&
                      holidays.map((h, i) => (
                        <div key={i} className="cell-badge badge-holiday" title={h.title}>
                          <Palmtree size={10} />
                          <span>{h.title}</span>
                        </div>
                      ))}

                    {showLeave &&
                      leaves.map((l) => (
                        <div
                          key={l.id}
                          className={`cell-badge badge-leave-${l.status}`}
                          title={`${l.leave_type} leave (${l.status})`}
                        >
                          {l.status === "approved" ? (
                            <CheckCircle2 size={10} />
                          ) : l.status === "pending" ? (
                            <Clock size={10} />
                          ) : (
                            <XCircle size={10} />
                          )}
                          <span>
                            {l.leave_type === "annual" ? "Annual" : "Sick"} ({l.status})
                          </span>
                        </div>
                      ))}

                    {showTeam &&
                      teamLeaves.map((tl) => (
                        <div
                          key={tl.id}
                          className="cell-badge badge-team-leave"
                          title={`${tl.employee_name || "Direct Report"}: ${tl.leave_type} (${tl.status})`}
                        >
                          <Users size={10} />
                          <span>
                            {tl.employee_name ? tl.employee_name.split(" ")[0] : "Team"} ({tl.status})
                          </span>
                        </div>
                      ))}

                    {showEvent &&
                      events.map((ev) => (
                        <div key={ev.id} className="cell-badge badge-event" title={ev.title}>
                          <CalendarIcon size={10} />
                          <span>{ev.title}</span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Inspector Side Panel */}
        <div className="calendar-side-inspector">
          <div className="inspector-card">
            <div className="inspector-header">
              <span className="inspector-tag">SCHEDULE DETAILS</span>
              <h3 className="inspector-title">
                {selectedDateStr ? formatDisplayDate(selectedDateStr) : "Select a date"}
              </h3>
            </div>

            {loading ? (
              <div className="inspector-loading">
                <RefreshCw size={18} className="spin text-muted" />
                <p>Loading schedule details...</p>
              </div>
            ) : selectedDateStr && selectedDetails ? (
              <div className="inspector-content">
                {/* 1. Company Holidays */}
                {selectedDetails.holidays.length > 0 && (
                  <div className="inspector-section">
                    <h4 className="section-subtitle text-amber">
                      <Palmtree size={14} /> Company Holiday
                    </h4>
                    {selectedDetails.holidays.map((h, i) => (
                      <div key={i} className="inspector-item-box item-holiday">
                        <strong className="item-title">{h.title}</strong>
                        <p className="item-desc">
                          Authorized corporate holiday (Asia/Kolkata). Does not deduct from annual leave balance.
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Employee Leaves */}
                {selectedDetails.leaves.length > 0 && (
                  <div className="inspector-section">
                    <h4 className="section-subtitle text-blue">
                      <CalendarDays size={14} /> Your Leave Request
                    </h4>
                    {selectedDetails.leaves.map((l) => (
                      <div key={l.id} className={`inspector-item-box item-leave-${l.status}`}>
                        <div className="item-header-row">
                          <strong className="item-title capitalize">
                            {l.leave_type} Leave
                          </strong>
                          <span className={`status-pill status-${l.status}`}>
                            {l.status}
                          </span>
                        </div>
                        <p className="item-desc">
                          {l.start_date} to {l.end_date} · {l.days} working {l.days === 1 ? "day" : "days"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Team Member Leaves (for Manager) */}
                {selectedDetails.teamLeaves.length > 0 && (
                  <div className="inspector-section">
                    <h4 className="section-subtitle text-purple">
                      <Users size={14} /> Direct Reports on Leave
                    </h4>
                    {selectedDetails.teamLeaves.map((tl) => (
                      <div key={tl.id} className="inspector-item-box item-team">
                        <div className="item-header-row">
                          <strong className="item-title">
                            {tl.employee_name || "Direct Report"}
                          </strong>
                          <span className={`status-pill status-${tl.status}`}>
                            {tl.status}
                          </span>
                        </div>
                        <p className="item-desc">
                          {tl.leave_type} leave · {tl.days} working {tl.days === 1 ? "day" : "days"} ({tl.start_date} → {tl.end_date})
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Scheduled Calendar Events (Labeled as Demonstration Record) */}
                {selectedDetails.events.length > 0 && (
                  <div className="inspector-section">
                    <h4 className="section-subtitle text-slate">
                      <Clock size={14} /> Scheduled Events
                    </h4>
                    {selectedDetails.events.map((ev) => (
                      <div key={ev.id} className="inspector-item-box item-event">
                        <div className="item-header-row">
                          <strong className="item-title">{ev.title}</strong>
                          <span className="badge badge-sm badge-neutral">Simulated record</span>
                        </div>
                        <p className="item-desc">
                          {new Date(ev.starts_at).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {new Date(ev.ends_at).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          IST
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State for Selected Date */}
                {selectedDetails.holidays.length === 0 &&
                  selectedDetails.leaves.length === 0 &&
                  selectedDetails.teamLeaves.length === 0 &&
                  selectedDetails.events.length === 0 && (
                    <div className="inspector-empty">
                      <Info size={24} className="text-muted mb-2" />
                      <p className="font-medium text-slate-700">
                        {isSelectedDateAWeekend ? "Weekend (Standard Rest Day)" : "Standard Working Day"}
                      </p>
                      <p className="text-sm text-muted">
                        No holidays or leave requests scheduled for this date.
                      </p>
                      {onNavigateLeave && !isSelectedDateAWeekend && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={onNavigateLeave}
                        >
                          Request leave for this date
                        </Button>
                      )}
                    </div>
                  )}
              </div>
            ) : (
              <div className="inspector-empty">
                <CalendarIcon size={24} className="text-muted mb-2" />
                <p className="text-muted">Click any date to inspect scheduled events and leaves.</p>
              </div>
            )}

            <div className="inspector-footer">
              <span className="legend-title">Legend:</span>
              <div className="legend-items">
                <span className="legend-chip"><i className="dot dot-amber" /> Company Holiday</span>
                <span className="legend-chip"><i className="dot dot-emerald" /> Approved Leave</span>
                <span className="legend-chip"><i className="dot dot-orange" /> Pending Leave</span>
                {isManager && (
                  <span className="legend-chip"><i className="dot dot-purple" /> Direct Report Leave</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
