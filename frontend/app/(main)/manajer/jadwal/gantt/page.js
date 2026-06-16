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

const ROW_HEIGHT  = 56;
const LABEL_WIDTH = 140;
const RULER_H     = 48;

const toWIB = (str) => {
  if (!str) return null;
  const s = str.includes('T') ? str : str.replace(' ', 'T') + '+07:00';
  return new Date(s);
};

const fmt = (date, opts) => date ? date.toLocaleString('id-ID', opts) : '-';

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

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const fetchJobsBySchedule = async (schedule) => {
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/result/${schedule.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
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
      const res  = await fetch(`${BASE_URL}/pipeline/schedules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
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
    const alreadyLoaded = allJobs.some(j => j._scheduleId === schedule.id);
    if (!alreadyLoaded) {
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

  const machines = [...new Set(filteredJobs.map(j => j._machineId))].filter(Boolean).sort();

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

  const jobStatusColor = {
    Completed:     '#22c55e',
    'In Progress': '#3b82f6',
    Delayed:       '#ef4444',
    Failed:        '#ef4444',
  };

  const statusConfig = {
    draft:   { label: 'Draft',   severity: 'secondary' },
    final:   { label: 'Final',   severity: 'success'   },
    revised: { label: 'Revised', severity: 'warning'   },
  };

  // Fungsi memicu printer browser
  const handlePrint = () => {
    window.print();
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
            position:   'absolute', top: isHour ? 0 : RULER_H / 2, bottom: 0,
            width: 1, background: isHour ? '#cbd5e1' : '#e2e8f0',
          }} />
          <div style={{
            position:   'absolute', top: isHour ? 6 : RULER_H / 2 + 4, left: 4,
            fontSize:   '0.72rem',
            fontWeight: isHour ? 700 : 400,
            color:      isHour ? 'var(--text-color)' : 'var(--text-color-secondary)',
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
          background: isHour ? '#e2e8f0' : '#f1f5f9', pointerEvents: 'none',
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
      }}>
        <div style={{
          position: 'absolute', top: 4, left: 4,
          background: '#ef4444', color: 'white',
          fontSize: '0.6rem', fontWeight: 700,
          padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap',
        }}>
          {fmt(now, { hour: '2-digit', minute: '2-digit' })} WIB
        </div>
      </div>
    );
  };

  const renderBars = (machineId) =>
    filteredJobs.filter(j => j._machineId === machineId).map(job => {
      if (!job._start || !job._end) return null;
      const left    = ((job._start.getTime() - minTime) / 60000) * zoom;
      const width   = Math.max(((job._end.getTime() - job._start.getTime()) / 60000) * zoom, 24);
      const color   = jobStatusColor[job.job_status] || getColor(job.job_id);
      const isWarn  = job._dl && job._end > job._dl;
      const isHov   = hoveredJob === job.job_id;

      return (
        <div
          key={job.job_id}
          style={{
            position: 'absolute', left, width, top: 8, bottom: 8,
            background:   color,
            borderRadius: 8,
            border:       isWarn ? '2px solid #dc2626' : isHov ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
            boxShadow:    isHov ? `0 2px 12px rgba(0,0,0,0.2)` : '0 1px 3px rgba(0,0,0,0.12)',
            transition:   'all 0.12s',
            zIndex:       isHov ? 10 : 2,
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            overflow:     'hidden',
          }}
          onMouseEnter={(e) => { setHoveredJob(job.job_id); setTooltip({ visible: true, x: e.clientX, y: e.clientY, job }); }}
          onMouseMove={(e)  => setTooltip(p => ({ ...p, x: e.clientX, y: e.clientY }))}
          onMouseLeave={()  => { setHoveredJob(null); setTooltip({ visible: false, x: 0, y: 0, job: null }); }}
        >
          {width > 50 && (
            <span style={{
              color: 'white', fontWeight: 700, fontSize: '0.68rem',
              padding: '0 8px', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}>
              {job.job_id} · {job.operation_type}
            </span>
          )}
          {isWarn && <span style={{ position: 'absolute', right: 4, fontSize: '0.7rem' }}>⚠️</span>}
        </div>
      );
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

  return (
    <div>
      {/* INJEKSI STYLE CSS UNTUK PRINT */}
      <style jsx global>{`
        .print-only-container {
          display: none;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .print-only-container, .print-only-container * {
            visibility: visible;
          }
          .print-only-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-family: sans-serif;
            font-size: 12px;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
          }
          .print-table th {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .status-tag {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            color: white;
          }
        }
      `}</style>

      <Toast ref={toast} />

      {/* ==================== SCREEN INTERFACE (TAMPIL DI WEB) ==================== */}
      <div className="screen-content">
        {/* TOOLTIP */}
        {tooltip.visible && tooltip.job && (
          <div style={{
            position: 'fixed',
            left:     Math.min(tooltip.x + 14, window.innerWidth - 260),
            top:      tooltip.y - 10,
            zIndex:   9999,
            background:   'var(--surface-overlay)',
            border:       '1px solid var(--surface-border)',
            borderRadius: 10,
            padding:      '12px 14px',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
            minWidth:     220,
            pointerEvents: 'none',
          }}>
            <div style={{
              fontWeight: 700, fontSize: '0.9rem',
              color: getColor(tooltip.job.job_id),
              marginBottom: 8, paddingBottom: 6,
              borderBottom: '1px solid var(--surface-border)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {tooltip.job.job_id}
              <Tag
                value={tooltip.job.job_status}
                severity={{ Completed: 'success', 'In Progress': 'info', Delayed: 'danger', Failed: 'danger', Scheduled: 'info', Pending: 'warning' }[tooltip.job.job_status] || 'info'}
                style={{ fontSize: '0.6rem' }}
              />
            </div>
            {[
              ['Jadwal',    tooltip.job._scheduleCode],
              ['Operasi',   tooltip.job.operation_type],
              ['Mesin',     tooltip.job._machineName],
              ['Mulai',     fmt(tooltip.job._start, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })],
              ['Selesai',   fmt(tooltip.job._end,   { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })],
              ['Durasi',    tooltip.job._start && tooltip.job._end ? `${Math.round((tooltip.job._end - tooltip.job._start) / 60000)} menit` : '-'],
              ['Prioritas', tooltip.job.priority_score?.toFixed(1) || '-'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4, gap: 12 }}>
                <span style={{ color: 'var(--text-color-secondary)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            {tooltip.job._dl && (
              <div style={{
                marginTop: 6, paddingTop: 6,
                borderTop: '1px solid var(--surface-border)',
                fontSize: '0.75rem', fontWeight: 600,
                color: tooltip.job._end > tooltip.job._dl ? '#ef4444' : '#22c55e',
              }}>
                {tooltip.job._end > tooltip.job._dl ? '⚠ Melewati deadline!' : '✓ Tepat deadline'}
              </div>
            )}
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="m-0 mb-1">Gantt Chart Penjadwalan</h2>
            <p className="m-0 text-color-secondary text-sm">
              {fmt(now, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} • {fmt(now, { hour: '2-digit', minute: '2-digit' })} WIB
            </p>
          </div>
          <div className="flex gap-2">
            {/* Tombol Cetak Baru */}
            <Button 
              label="Cetak Jadwal" 
              icon="pi pi-print" 
              severity="secondary"
              outlined 
              disabled={filteredJobs.length === 0}
              onClick={handlePrint} 
            />
            <Button icon="pi pi-refresh" text onClick={() => loadJobsForDate(filterDate)} loading={loading} tooltip="Refresh" />
          </div>
        </div>

        {/* KONTROL */}
        <div className="card mb-3">
          <div className="flex align-items-center gap-3 flex-wrap">
            {/* STEP 1: Tanggal */}
            <div className="flex align-items-center gap-2">
              <div style={{
                background: '#6366f1', color: 'white',
                borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
              }}>1</div>
              <span className="font-semibold text-sm">Tanggal:</span>
              <Calendar
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.value);
                  setSelectedSchedule(null);
                  loadJobsForDate(e.value);
                }}
                dateFormat="dd MM yy"
                showIcon
                style={{ width: 170 }}
              />
              <Button
                label="Hari Ini"
                size="small"
                text
                onClick={() => {
                  const today = new Date();
                  setFilterDate(today);
                  setSelectedSchedule(null);
                  loadJobsForDate(today);
                }}
              />
            </div>

            <i className="pi pi-angle-right text-color-secondary" />

            {/* STEP 2: Jadwal (opsional) */}
            <div className="flex align-items-center gap-2">
              <div style={{
                background: selectedSchedule ? '#22c55e' : '#94a3b8', color: 'white',
                borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
              }}>2</div>
              <span className="font-semibold text-sm">Jadwal <span className="text-color-secondary font-normal">(opsional):</span></span>
              <Dropdown
                value={selectedSchedule}
                options={[{ schedule_code: '— Semua Jadwal —', id: null }, ...schedules]}
                onChange={(e) => {
                  if (!e.value || !e.value.id) {
                    setSelectedSchedule(null);
                    loadJobsForDate(filterDate);
                  } else {
                    handleSelectSchedule(e.value);
                  }
                }}
                optionLabel="schedule_code"
                placeholder="— Semua Jadwal —"
                style={{ width: 210 }}
                itemTemplate={(opt) => (
                  <div className="flex justify-content-between align-items-center gap-2">
                    <span className="text-sm">{opt.schedule_code}</span>
                    {opt.status_jadwal && (
                      <Tag
                        value={statusConfig[opt.status_jadwal]?.label}
                        severity={statusConfig[opt.status_jadwal]?.severity}
                      />
                    )}
                  </div>
                )}
              />
              {selectedSchedule && (
                <Button
                  icon="pi pi-times"
                  rounded text size="small"
                  tooltip="Reset ke semua jadwal"
                  onClick={() => { setSelectedSchedule(null); loadJobsForDate(filterDate); }}
                />
              )}
            </div>

            {/* ZOOM */}
            <div className="flex align-items-center gap-2 ml-auto">
              <span className="font-semibold text-sm">Zoom:</span>
              <Dropdown
                value={zoom}
                options={ZOOM_OPTIONS}
                onChange={(e) => setZoom(e.value)}
                style={{ width: 185 }}
              />
              <Button label="⏱ Sekarang" severity="danger" size="small" outlined onClick={scrollToNow} />
            </div>
          </div>

          {/* INFO HASIL FILTER */}
          <div className="mt-3 pt-3 flex align-items-center gap-3 flex-wrap"
            style={{ borderTop: '1px solid var(--surface-border)' }}>
            <span className="text-sm">
              Menampilkan <b>{filteredJobs.length}</b> job
              {!selectedSchedule && filterDate && <> pada <b>{fmt(filterDate, { day: '2-digit', month: 'long', year: 'numeric' })}</b></>}
              {selectedSchedule && <> · Jadwal <b>{selectedSchedule.schedule_code}</b> (semua tanggal)</>}
            </span>
            {selectedSchedule && (
              <div className="flex gap-2 align-items-center">
                <Tag value={statusConfig[selectedSchedule.status_jadwal]?.label} severity={statusConfig[selectedSchedule.status_jadwal]?.severity} />
                <span className="text-sm text-color-secondary">Makespan: <b>{selectedSchedule.makespan} mnt</b></span>
              </div>
            )}
          </div>
        </div>

        {/* LEGENDA */}
        <div className="card mb-3 p-3">
          <div className="flex align-items-center gap-3 flex-wrap">
            <span className="font-semibold text-sm">Keterangan:</span>
            {[
              { label: 'Scheduled',      color: '#6366f1' },
              { label: 'In Progress',    color: '#3b82f6' },
              { label: 'Completed',      color: '#22c55e' },
              { label: 'Delayed/Failed', color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="flex align-items-center gap-1">
                <div style={{ width: 14, height: 14, borderRadius: 4, background: s.color }} />
                <span className="text-xs">{s.label}</span>
              </div>
            ))}
            <div className="flex align-items-center gap-1">
              <div style={{ width: 2, height: 16, background: '#ef4444', borderRadius: 2 }} />
              <span className="text-xs text-red-500">Waktu Sekarang</span>
            </div>
            <div className="flex align-items-center gap-1">
              <div style={{ width: 14, height: 14, borderRadius: 4, border: '2px solid #ef4444', background: 'transparent' }} />
              <span className="text-xs text-red-500">Melewati Deadline ⚠️</span>
            </div>
          </div>
        </div>

        {/* GANTT */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 10 }}>
          {loading ? (
            <div className="flex justify-content-center align-items-center" style={{ height: 200 }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#6366f1' }} />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-column align-items-center justify-content-center gap-3" style={{ height: 220 }}>
              <i className="pi pi-calendar-times" style={{ fontSize: '2.5rem', color: '#94a3b8' }} />
              <p className="m-0 font-semibold">Tidak ada job pada tanggal ini</p>
              <p className="m-0 text-color-secondary text-sm">Coba pilih tanggal lain atau jalankan pipeline</p>
            </div>
          ) : (
            <div style={{ display: 'flex', userSelect: 'none' }}>
              {/* LABEL MESIN */}
              <div style={{
                width: LABEL_WIDTH, flexShrink: 0,
                borderRight: '2px solid var(--surface-border)',
                background: 'var(--surface-ground)',
              }}>
                <div style={{ height: RULER_H, borderBottom: '1px solid var(--surface-border)' }} />
                {machines.map((mid, mi) => (
                  <div key={mid} style={{
                    height: ROW_HEIGHT,
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'flex-end',
                    paddingRight: 14, paddingLeft: 8,
                    borderBottom: '1px solid var(--surface-border)',
                    background: mi % 2 === 0 ? 'var(--surface-ground)' : 'var(--surface-section)',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{mid}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-color-secondary)' }}>
                      {filteredJobs.filter(j => j._machineId === mid).length} jobs
                    </span>
                  </div>
                ))}
              </div>

              {/* SCROLL AREA */}
              <div
                ref={scrollRef}
                style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', cursor: 'grab' }}
                onMouseDown={onMouseDown}
              >
                <div style={{ width: Math.max(totalWidth, 600), position: 'relative' }}>
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
          )}

          {filteredJobs.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 16px', borderTop: '1px solid var(--surface-border)',
              background: 'var(--surface-ground)', fontSize: '0.78rem', color: 'var(--text-color-secondary)',
            }}>
              <span><b>{filteredJobs.length}</b> jobs · <b>{machines.length}</b> mesin</span>
              <span>Drag untuk scroll · Zoom untuk perbesar/perkecil</span>
            </div>
          )}
        </div>
      </div>


      {/* ==================== PRINT ONLY STRUCTURE (STRUKTUR TAMPILAN CETAK) ==================== */}
      <div className="print-only-container">
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #334155', paddingBottom: '10px' }}>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>Laporan Hasil Jadwal Kerja </h1>
          <p style={{ margin: 0, color: '#475569', fontSize: '12px' }}>
            Tanggal Filter: {fmt(filterDate, { day: '2-digit', month: 'long', year: 'numeric' })} | Dicetak pada: {fmt(new Date(), { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
          </p>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Status</th>
              <th>No. Jadwal (Schedule Code)</th>
              <th>Operasi</th>
              <th>Mesin</th>
              <th>Mulai (Start)</th>
              <th>Selesai (End)</th>
              <th>Durasi</th>
              <th>Prioritas</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => {
              const duration = job._start && job._end ? `${Math.round((job._end - job._start) / 60000)} menit` : '-';
              const isOverDeadline = job._dl && job._end > job._dl;
              const statusBg = jobStatusColor[job.job_status] || '#6366f1';
              
              return (
                <tr key={job.job_id}>
                  <td style={{ fontWeight: 'bold', color: '#1e293b' }}>{job.job_id}</td>
                  <td>
                    <span className="status-tag" style={{ backgroundColor: statusBg }}>
                      {job.job_status}
                    </span>
                  </td>
                  <td>{job._scheduleCode || '-'}</td>
                  <td>{job.operation_type || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{job._machineName} ({job._machineId})</td>
                  <td>{fmt(job._start, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{fmt(job._end, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{duration}</td>
                  <td>{job.priority_score?.toFixed(1) || '-'}</td>
                  <td style={{ fontWeight: '500', color: isOverDeadline ? '#dc2626' : '#16a34a' }}>
                    {isOverDeadline ? '⚠️ Melewati Deadline' : '✓ Tepat Deadline'}
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