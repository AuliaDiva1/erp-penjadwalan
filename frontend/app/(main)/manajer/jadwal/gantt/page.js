'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast }    from 'primereact/toast';
import { Button }   from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Tag }      from 'primereact/tag';
import { Calendar } from 'primereact/calendar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const COLORS = [
  '#6366f1','#f59e0b','#22c55e','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4',
];

const ZOOM_OPTIONS = [
  { label: 'Ringkas (1mnt = 4px)',  value: 4  },
  { label: 'Normal (1mnt = 8px)',   value: 8  },
  { label: 'Detail (1mnt = 16px)',  value: 16 },
];

const ROW_HEIGHT  = 60;
const LABEL_WIDTH = 160;
const RULER_H     = 52;

const DEFAULT_WORK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const DEFAULT_CALENDAR  = { work_start: '08:00', work_end: '17:00', work_days: DEFAULT_WORK_DAYS, holidays: [] };

const toWIB = (str) => {
  if (!str) return null;
  const s = str.includes('T') ? str : str.replace(' ', 'T') + '+07:00';
  return new Date(s);
};

const fmt = (date, opts) => date ? date.toLocaleString('id-ID', { ...opts, timeZone: 'Asia/Jakarta' }) : '-';

const getRealDuration = (job) => {
  const val = job.duration ?? job.predicted_duration ?? job.processing_time;
  return (val !== undefined && val !== null) ? `${Math.round(val)} menit` : '-';
};

function getWorkSegments(startDt, endDt, calendar) {
  if (!startDt || !endDt || endDt <= startDt) return [];
  const { work_start = '08:00', work_end = '17:00', work_days = DEFAULT_WORK_DAYS, holidays = [] } = calendar || {};
  const [wsH, wsM] = work_start.split(':').map(Number);
  const [weH, weM] = work_end.split(':').map(Number);
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const wibParts = (d) => {
    const w = new Date(d.getTime() + 7 * 3600 * 1000);
    return { y: w.getUTCFullYear(), m: w.getUTCMonth(), d: w.getUTCDate(), dow: w.getUTCDay() };
  };
  const wibToUTC = (y, m, d, h, mi) => new Date(Date.UTC(y, m, d, h, mi) - 7 * 3600 * 1000);
  const incDay = (p) => {
    const t = new Date(Date.UTC(p.y, p.m, p.d) + 24 * 3600 * 1000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), dow: t.getUTCDay() };
  };
  const segments = [];
  let p = wibParts(startDt);
  for (let i = 0; i < 60; i++) {
    const dayStart = wibToUTC(p.y, p.m, p.d, wsH, wsM);
    if (dayStart.getTime() > endDt.getTime()) break;
    const dayEnd  = wibToUTC(p.y, p.m, p.d, weH, weM);
    const dateStr = `${p.y}-${String(p.m + 1).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;
    const isWorkday = work_days.includes(dayNames[p.dow]) && !holidays.includes(dateStr);
    if (isWorkday) {
      const segStart = startDt > dayStart ? startDt : dayStart;
      const segEnd   = endDt   < dayEnd   ? endDt   : dayEnd;
      if (segStart < segEnd) segments.push([segStart, segEnd]);
    }
    p = incDay(p);
  }
  return segments.length ? segments : [[startDt, endDt]];
}

const STATUS_COLOR = {
  Completed:     '#22c55e',
  'In Progress': '#3b82f6',
  Delayed:       '#ef4444',
  Failed:        '#ef4444',
  Scheduled:     '#6366f1',
  Pending:       '#f59e0b',
};

const STATUS_SEVERITY = {
  Completed:     'success',
  'In Progress': 'info',
  Delayed:       'danger',
  Failed:        'danger',
  Scheduled:     'info',
  Pending:       'warning',
};

const SCHEDULE_STATUS = {
  draft:   { label: 'Draft',   severity: 'secondary' },
  final:   { label: 'Final',   severity: 'success'   },
  revised: { label: 'Revised', severity: 'warning'   },
};

export default function GanttChartPage() {
  const toast     = useRef(null);
  const scrollRef = useRef(null);

  const [allJobs,          setAllJobs]          = useState([]);
  const [schedules,        setSchedules]        = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [tooltip,          setTooltip]          = useState({ visible: false, x: 0, y: 0, job: null });
  const [hoveredJob,       setHoveredJob]       = useState(null);
  const [now,              setNow]              = useState(new Date());
  const [zoom,             setZoom]             = useState(8);
  const [filterDate,       setFilterDate]       = useState(new Date());
  const [calendar,         setCalendar]         = useState(DEFAULT_CALENDAR);

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/work-calendar`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const data = await res.json();
        if (data?.success && data.data) {
          const cal      = data.data.calendar  || {};
          const workDays = (data.data.work_days || []).filter(d => d.is_workday).map(d => d.day_name);
          setCalendar({
            work_start: String(cal.work_start || '08:00:00').slice(0, 5),
            work_end:   String(cal.work_end   || '17:00:00').slice(0, 5),
            work_days:  workDays.length ? workDays : DEFAULT_WORK_DAYS,
            holidays:   [],
          });
        }
      } catch {}
    };
    fetchCalendar();
  }, []);

  const fetchJobsBySchedule = async (schedule) => {
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/result/${schedule.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success) {
        return (data.data.jobs || []).map(j => ({
          ...j,
          _start:        toWIB(j.scheduled_start),
          _end:          toWIB(j.scheduled_end),
          _dl:           toWIB(j.deadline_predicted),
          _scheduleId:   schedule.id,
          _scheduleCode: schedule.schedule_code,
          _machineId:    j.assigned_machine_code || j.machine_id   || '-',
          _machineName:  j.assigned_machine_name || j.machine_name || '-',
        }));
      }
    } catch {}
    return [];
  };

  const loadJobsForDate = async (date) => {
    setLoading(true);
    setSelectedSchedule(null);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/schedules`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!data.success) return;
      setSchedules(data.data);
      const results = await Promise.all(data.data.map(s => fetchJobsBySchedule(s)));
      setAllJobs(results.flat());
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchedule = async (schedule) => {
    setSelectedSchedule(schedule);
    if (!allJobs.some(j => j._scheduleId === schedule.id)) {
      setLoading(true);
      try {
        const jobs = await fetchJobsBySchedule(schedule);
        setAllJobs(prev => [...prev, ...jobs]);
      } catch {
        toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat jobs' });
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => { loadJobsForDate(filterDate); }, []);

  const filteredJobs = allJobs.filter(j => {
    if (selectedSchedule) return j._scheduleId === selectedSchedule.id;
    if (!j._start || !filterDate) return true;
    const dayStart = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 0, 0, 0);
    const dayEnd   = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59);
    return j._start <= dayEnd && j._end >= dayStart;
  });

  const machines     = [...new Set(filteredJobs.map(j => j._machineId))].filter(Boolean).sort();
  const minTime      = filteredJobs.length ? Math.min(...filteredJobs.map(j => j._start?.getTime()).filter(Boolean)) : new Date().setHours(7,0,0,0);
  const maxTime      = filteredJobs.length ? Math.max(...filteredJobs.map(j => j._end?.getTime()).filter(Boolean))   : new Date().setHours(18,0,0,0);
  const totalMinutes = Math.max((maxTime - minTime) / 60000, 60);
  const totalWidth   = totalMinutes * zoom;

  const scrollToNow = () => {
    if (!scrollRef.current) return;
    const offsetPx = ((now.getTime() - minTime) / 60000) * zoom;
    scrollRef.current.scrollLeft = Math.max(0, offsetPx - scrollRef.current.clientWidth / 2);
  };

  useEffect(() => {
    if (filteredJobs.length > 0) setTimeout(scrollToNow, 150);
  }, [filteredJobs, zoom]);

  const getColor = (jobId) => {
    const idx = allJobs.findIndex(j => j.job_id === jobId);
    return COLORS[idx % COLORS.length];
  };

  const renderRuler = () => {
    const marks = [];
    const step  = 30 * 60 * 1000;
    const start = Math.floor(minTime / step) * step;
    for (let t = start; t <= maxTime + step; t += step) {
      const left   = ((t - minTime) / 60000) * zoom;
      const date   = new Date(t);
      const isHour = date.getMinutes() === 0;
      marks.push(
        <div key={t} style={{ position: 'absolute', left, top: 0, bottom: 0, userSelect: 'none' }}>
          <div style={{
            position: 'absolute', top: isHour ? 0 : RULER_H / 2, bottom: 0,
            width: 1, background: isHour ? '#cbd5e1' : '#e2e8f0',
          }} />
          <div style={{
            position: 'absolute', top: isHour ? 8 : RULER_H / 2 + 5, left: 5,
            fontSize: isHour ? '0.7rem' : '0.65rem',
            fontWeight: isHour ? 700 : 400,
            color: isHour ? 'var(--text-color)' : 'var(--text-color-secondary)',
            whiteSpace: 'nowrap',
          }}>
            {isHour
              ? fmt(date, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : fmt(date, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    }
    return marks;
  };

  const renderGrid = () => {
    const lines = [];
    const step  = 30 * 60 * 1000;
    const start = Math.floor(minTime / step) * step;
    for (let t = start; t <= maxTime + step; t += step) {
      const left   = ((t - minTime) / 60000) * zoom;
      const isHour = new Date(t).getMinutes() === 0;
      lines.push(
        <div key={t} style={{
          position: 'absolute', left, top: 0, bottom: 0, width: 1,
          background: isHour ? 'rgba(148,163,184,0.3)' : 'rgba(226,232,240,0.5)',
          pointerEvents: 'none',
        }} />
      );
    }
    return lines;
  };

  const renderNowLine = () => {
    if (now.getTime() < minTime || now.getTime() > maxTime) return null;
    const left = ((now.getTime() - minTime) / 60000) * zoom;
    return (
      <div style={{
        position: 'absolute', left, top: 0, bottom: 0,
        width: 2, background: '#ef4444', zIndex: 30, pointerEvents: 'none',
        boxShadow: '0 0 6px rgba(239,68,68,0.4)',
      }}>
        <div style={{
          position: 'absolute', top: 4, left: 4,
          background: '#ef4444', color: 'white',
          fontSize: '0.58rem', fontWeight: 700,
          padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}>
          {fmt(now, { hour: '2-digit', minute: '2-digit' })} WIB
        </div>
      </div>
    );
  };

  const renderBars = (machineId) =>
    filteredJobs.filter(j => j._machineId === machineId).flatMap(job => {
      if (!job._start || !job._end) return [];
      const segments = getWorkSegments(job._start, job._end, calendar);
      if (segments.length === 0) return [];

      const baseColor = STATUS_COLOR[job.job_status] || getColor(job.job_id);
      const isWarn    = job._dl && job._end > job._dl;
      const isHov     = hoveredJob === job.job_id;

      return segments.map(([segStart, segEnd], idx) => {
        const left    = ((segStart.getTime() - minTime) / 60000) * zoom;
        const width   = Math.max(((segEnd.getTime() - segStart.getTime()) / 60000) * zoom, 6);
        const isFirst = idx === 0;
        const isLast  = idx === segments.length - 1;

        return (
          <div
            key={`${job.job_id}-${idx}`}
            style={{
              position: 'absolute', left, width, top: 10, bottom: 10,
              background:   `linear-gradient(135deg, ${baseColor}ee, ${baseColor}bb)`,
              borderRadius: 7,
              border:       isWarn
                ? '2px solid #dc2626'
                : isHov
                ? '2px solid rgba(255,255,255,0.9)'
                : '1.5px solid rgba(255,255,255,0.2)',
              boxShadow: isHov
                ? `0 4px 16px ${baseColor}55, 0 1px 4px rgba(0,0,0,0.15)`
                : `0 1px 4px rgba(0,0,0,0.12)`,
              transition:    'all 0.15s ease',
              zIndex:        isHov ? 10 : 2,
              cursor:        'pointer',
              display:       'flex',
              alignItems:    'center',
              overflow:      'hidden',
            }}
            onMouseEnter={(e) => { setHoveredJob(job.job_id); setTooltip({ visible: true, x: e.clientX, y: e.clientY, job }); }}
            onMouseMove={(e)  => setTooltip(p => ({ ...p, x: e.clientX, y: e.clientY }))}
            onMouseLeave={()  => { setHoveredJob(null); setTooltip({ visible: false, x: 0, y: 0, job: null }); }}
          >
            {isFirst && width > 55 && (
              <span style={{
                color: 'white', fontWeight: 700, fontSize: '0.67rem',
                padding: '0 9px', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
                textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                letterSpacing: '0.01em',
              }}>
                {job.job_id} · {job.operation_type}
              </span>
            )}
            {isWarn && isLast && (
              <span style={{ position: 'absolute', right: 5, fontSize: '0.7rem' }}>⚠️</span>
            )}
          </div>
        );
      });
    });

  const onMouseDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const startX  = e.pageX;
    const scrollL = el.scrollLeft;
    el.style.cursor = 'grabbing';
    const onMove = (ev) => { el.scrollLeft = scrollL - (ev.pageX - startX); };
    const onUp   = () => {
      el.style.cursor = 'grab';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const completedCount   = filteredJobs.filter(j => j.job_status === 'Completed').length;
  const inProgressCount  = filteredJobs.filter(j => j.job_status === 'In Progress').length;
  const delayedCount     = filteredJobs.filter(j => j.job_status === 'Delayed' || j.job_status === 'Failed').length;

  return (
    <div>
      <style jsx global>{`
        .gantt-scroll::-webkit-scrollbar { height: 6px; }
        .gantt-scroll::-webkit-scrollbar-track { background: var(--surface-ground); }
        .gantt-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .gantt-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .print-only-container { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-only-container, .print-only-container * { visibility: visible; }
          .print-only-container {
            display: block !important;
            position: absolute; left: 0; top: 0; width: 100%;
          }
          .print-table {
            width: 100%; border-collapse: collapse;
            font-family: sans-serif; font-size: 11px;
          }
          .print-table th, .print-table td {
            border: 1px solid #e2e8f0; padding: 7px 10px; text-align: left;
          }
          .print-table th {
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
            font-weight: 700; color: #334155;
          }
          .print-table tr:nth-child(even) td { background: #f8fafc; }
          .status-tag {
            display: inline-block; padding: 2px 7px;
            border-radius: 4px; font-size: 10px;
            font-weight: 700; color: white;
          }
        }
      `}</style>

      <Toast ref={toast} />

      {/* TOOLTIP */}
      {tooltip.visible && tooltip.job && (
        <div style={{
          position:     'fixed',
          left:         Math.min(tooltip.x + 16, window.innerWidth - 270),
          top:          Math.max(tooltip.y - 20, 10),
          zIndex:       9999,
          background:   'var(--surface-card)',
          border:       '1px solid var(--surface-border)',
          borderRadius: 12,
          padding:      '14px 16px',
          boxShadow:    '0 12px 40px rgba(0,0,0,0.15)',
          minWidth:     240,
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 10, paddingBottom: 10,
            borderBottom: '1px solid var(--surface-border)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: STATUS_COLOR[tooltip.job.job_status] || getColor(tooltip.job.job_id),
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-color)' }}>
              {tooltip.job.job_id}
            </span>
            <Tag
              value={tooltip.job.job_status}
              severity={STATUS_SEVERITY[tooltip.job.job_status] || 'info'}
              style={{ fontSize: '0.6rem', marginLeft: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              ['Jadwal',    tooltip.job._scheduleCode],
              ['Operasi',   tooltip.job.operation_type],
              ['Mesin',     tooltip.job._machineName],
              ['Mulai',     fmt(tooltip.job._start, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })],
              ['Selesai',   fmt(tooltip.job._end,   { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })],
              ['Durasi',    getRealDuration(tooltip.job)],
              ['Prioritas', tooltip.job.priority_score?.toFixed(1) || '-'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.77rem' }}>
                <span style={{ color: 'var(--text-color-secondary)' }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{v}</span>
              </div>
            ))}
          </div>
          {tooltip.job._dl && (
            <div style={{
              marginTop: 10, paddingTop: 8,
              borderTop: '1px solid var(--surface-border)',
              fontSize: '0.74rem', fontWeight: 700,
              color: tooltip.job._end > tooltip.job._dl ? '#ef4444' : '#22c55e',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {tooltip.job._end > tooltip.job._dl
                ? <><i className="pi pi-exclamation-triangle" /> Melewati deadline!</>
                : <><i className="pi pi-check-circle" /> Tepat deadline</>}
            </div>
          )}
        </div>
      )}

      <div className="screen-content">

        {/* HEADER */}
        <div className="flex justify-content-between align-items-start mb-4">
          <div>
            <h2 className="m-0 mb-1" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              Gantt Chart Penjadwalan
            </h2>
            <p className="m-0 text-color-secondary text-sm">
              {fmt(now, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              &nbsp;·&nbsp;
              <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                {fmt(now, { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              label="Cetak"
              icon="pi pi-print"
              severity="secondary"
              outlined
              disabled={filteredJobs.length === 0}
              onClick={() => window.print()}
              size="small"
            />
            <Button
              icon="pi pi-refresh"
              text
              onClick={() => loadJobsForDate(filterDate)}
              loading={loading}
              tooltip="Refresh data"
              size="small"
            />
          </div>
        </div>

        {/* STAT CARDS */}
        {filteredJobs.length > 0 && (
          <div className="grid mb-3">
            {[
              { label: 'Total Job',   value: filteredJobs.length, icon: 'pi-list',         color: '#6366f1', bg: '#eef2ff' },
              { label: 'In Progress', value: inProgressCount,     icon: 'pi-cog',          color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Selesai',     value: completedCount,      icon: 'pi-check-circle', color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Terlambat',   value: delayedCount,        icon: 'pi-exclamation-triangle', color: '#ef4444', bg: '#fef2f2' },
            ].map((s) => (
              <div key={s.label} className="col-6 md:col-3">
                <div className="card p-3 flex align-items-center gap-3" style={{ borderLeft: `3px solid ${s.color}` }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: s.bg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`pi ${s.icon}`} style={{ color: s.color, fontSize: '1.1rem' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                    <div className="text-color-secondary text-xs mt-1">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TOOLBAR */}
        <div className="card mb-3">
          <div className="flex align-items-center gap-3 flex-wrap">

            {/* Filter Tanggal */}
            <div className="flex align-items-center gap-2">
              <span className="font-semibold text-sm" style={{ whiteSpace: 'nowrap' }}>Tanggal:</span>
              <Calendar
                value={filterDate}
                onChange={(e) => { setFilterDate(e.value); setSelectedSchedule(null); loadJobsForDate(e.value); }}
                dateFormat="dd MM yy"
                showIcon
                style={{ width: 165 }}
              />
              <Button
                label="Hari Ini"
                size="small"
                text
                onClick={() => { const t = new Date(); setFilterDate(t); setSelectedSchedule(null); loadJobsForDate(t); }}
              />
            </div>

            <div style={{ width: 1, height: 28, background: 'var(--surface-border)' }} />

            {/* Filter Jadwal */}
            <div className="flex align-items-center gap-2">
              <span className="font-semibold text-sm" style={{ whiteSpace: 'nowrap' }}>Jadwal:</span>
              <Dropdown
                value={selectedSchedule}
                options={[{ schedule_code: 'Semua Jadwal', id: null }, ...schedules]}
                onChange={(e) => {
                  if (!e.value?.id) { setSelectedSchedule(null); loadJobsForDate(filterDate); }
                  else handleSelectSchedule(e.value);
                }}
                optionLabel="schedule_code"
                placeholder="Semua Jadwal"
                style={{ width: 200 }}
                itemTemplate={(opt) => (
                  <div className="flex justify-content-between align-items-center gap-2">
                    <span className="text-sm">{opt.schedule_code}</span>
                    {opt.status_jadwal && (
                      <Tag
                        value={SCHEDULE_STATUS[opt.status_jadwal]?.label}
                        severity={SCHEDULE_STATUS[opt.status_jadwal]?.severity}
                        style={{ fontSize: '0.6rem' }}
                      />
                    )}
                  </div>
                )}
              />
              {selectedSchedule && (
                <Button
                  icon="pi pi-times"
                  rounded text size="small"
                  onClick={() => { setSelectedSchedule(null); loadJobsForDate(filterDate); }}
                  tooltip="Reset jadwal"
                />
              )}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="font-semibold text-sm">Zoom:</span>
              <Dropdown
                value={zoom}
                options={ZOOM_OPTIONS}
                onChange={(e) => setZoom(e.value)}
                style={{ width: 190 }}
              />
              <Button
                label="Sekarang"
                icon="pi pi-clock"
                severity="danger"
                size="small"
                outlined
                onClick={scrollToNow}
              />
            </div>
          </div>

          {/* Info bar */}
          <div className="mt-3 pt-3 flex align-items-center gap-3 flex-wrap"
            style={{ borderTop: '1px solid var(--surface-border)' }}>
            <div className="flex align-items-center gap-2 text-sm">
              <i className="pi pi-info-circle text-color-secondary" />
              <span>
                <b>{filteredJobs.length}</b> job · <b>{machines.length}</b> mesin
                {!selectedSchedule && filterDate && (
                  <> · {fmt(filterDate, { day: '2-digit', month: 'long', year: 'numeric' })}</>
                )}
              </span>
            </div>
            {selectedSchedule && (
              <div className="flex align-items-center gap-2">
                <Tag
                  value={SCHEDULE_STATUS[selectedSchedule.status_jadwal]?.label}
                  severity={SCHEDULE_STATUS[selectedSchedule.status_jadwal]?.severity}
                />
                <span className="text-sm text-color-secondary">
                  Makespan: <b>{selectedSchedule.makespan} mnt</b>
                </span>
              </div>
            )}

            {/* Legend */}
            <div className="flex align-items-center gap-3 ml-auto flex-wrap">
              {[
                { label: 'Scheduled',      color: '#6366f1' },
                { label: 'In Progress',    color: '#3b82f6' },
                { label: 'Completed',      color: '#22c55e' },
                { label: 'Delayed/Failed', color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="flex align-items-center gap-1">
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
                  <span className="text-xs text-color-secondary">{s.label}</span>
                </div>
              ))}
              <div className="flex align-items-center gap-1">
                <div style={{ width: 2, height: 14, background: '#ef4444', borderRadius: 2 }} />
                <span className="text-xs" style={{ color: '#ef4444' }}>Sekarang</span>
              </div>
            </div>
          </div>
        </div>

        {/* GANTT CHART */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12 }}>
          {loading ? (
            <div className="flex flex-column justify-content-center align-items-center gap-3" style={{ height: 220 }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#6366f1' }} />
              <span className="text-color-secondary text-sm">Memuat data jadwal...</span>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-column align-items-center justify-content-center gap-3" style={{ height: 240 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="pi pi-calendar-times" style={{ fontSize: '1.8rem', color: '#94a3b8' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="m-0 font-semibold" style={{ fontSize: '0.95rem' }}>Tidak ada job pada tanggal ini</p>
                <p className="m-0 text-color-secondary text-sm mt-1">Coba pilih tanggal lain atau jalankan pipeline</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex' }}>
                {/* LABEL KOLOM */}
                <div style={{
                  width: LABEL_WIDTH, flexShrink: 0,
                  borderRight: '2px solid var(--surface-border)',
                  background: 'var(--surface-ground)',
                }}>
                  <div style={{
                    height: RULER_H,
                    borderBottom: '2px solid var(--surface-border)',
                    display: 'flex', alignItems: 'center', paddingLeft: 14,
                  }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Mesin
                    </span>
                  </div>
                  {machines.map((mid, mi) => {
                    const jobCount = filteredJobs.filter(j => j._machineId === mid).length;
                    return (
                      <div key={mid} style={{
                        height: ROW_HEIGHT,
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'center',
                        paddingLeft: 14, paddingRight: 10,
                        borderBottom: '1px solid var(--surface-border)',
                        background: mi % 2 === 0 ? 'var(--surface-ground)' : 'var(--surface-section)',
                      }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-color)' }}>{mid}</span>
                        <span style={{ fontSize: '0.67rem', color: 'var(--text-color-secondary)', marginTop: 2 }}>
                          {jobCount} job{jobCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* SCROLL AREA */}
                <div
                  ref={scrollRef}
                  className="gantt-scroll"
                  style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', cursor: 'grab' }}
                  onMouseDown={onMouseDown}
                >
                  <div style={{ width: Math.max(totalWidth, 600), position: 'relative', userSelect: 'none' }}>
                    {/* RULER */}
                    <div style={{
                      height: RULER_H, position: 'relative',
                      background: 'var(--surface-ground)',
                      borderBottom: '2px solid var(--surface-border)',
                    }}>
                      {renderRuler()}
                    </div>

                    {/* ROWS */}
                    {machines.map((mid, mi) => (
                      <div key={mid} style={{
                        height: ROW_HEIGHT, position: 'relative',
                        background: mi % 2 === 0 ? 'var(--surface-ground)' : 'var(--surface-section)',
                        borderBottom: '1px solid var(--surface-border)',
                      }}>
                        {renderGrid()}
                        {renderBars(mid)}
                        {renderNowLine()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 16px', borderTop: '1px solid var(--surface-border)',
                background: 'var(--surface-ground)',
                fontSize: '0.75rem', color: 'var(--text-color-secondary)',
              }}>
                <span><b>{filteredJobs.length}</b> jobs · <b>{machines.length}</b> mesin aktif</span>
                <span><i className="pi pi-hand-paper mr-1" />Drag untuk scroll · Zoom untuk memperbesar</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PRINT VIEW */}
      <div className="print-only-container">
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #334155' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: 18, color: '#0f172a' }}>Laporan Hasil Jadwal Kerja</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 11 }}>
            Tanggal: {fmt(filterDate, { day: '2-digit', month: 'long', year: 'numeric' })}
            &nbsp;|&nbsp;
            Dicetak: {fmt(new Date(), { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
            {selectedSchedule && ` | Jadwal: ${selectedSchedule.schedule_code}`}
          </p>
        </div>
        <table className="print-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Job ID</th>
              <th>Status</th>
              <th>Jadwal</th>
              <th>Operasi</th>
              <th>Mesin</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Durasi</th>
              <th>Prioritas</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job, idx) => {
              const isOverDeadline = job._dl && job._end > job._dl;
              const statusBg = STATUS_COLOR[job.job_status] || '#6366f1';
              return (
                <tr key={job.job_id}>
                  <td style={{ color: '#64748b', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{job.job_id}</td>
                  <td>
                    <span className="status-tag" style={{ backgroundColor: statusBg }}>
                      {job.job_status}
                    </span>
                  </td>
                  <td>{job._scheduleCode || '-'}</td>
                  <td>{job.operation_type || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{job._machineName}</td>
                  <td>{fmt(job._start, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{fmt(job._end,   { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{getRealDuration(job)}</td>
                  <td style={{ textAlign: 'center' }}>{job.priority_score?.toFixed(1) || '-'}</td>
                  <td style={{ fontWeight: 600, color: isOverDeadline ? '#dc2626' : '#16a34a' }}>
                    {isOverDeadline ? '⚠ Melewati Deadline' : '✓ Tepat Deadline'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}