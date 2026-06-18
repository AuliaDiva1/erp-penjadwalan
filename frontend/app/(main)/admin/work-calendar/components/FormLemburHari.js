'use client';
import { useState, useEffect } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { InputMask }   from 'primereact/inputmask';
import { Button }      from 'primereact/button';
import { Skeleton }    from 'primereact/skeleton';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function FormLemburHari({ workDays, overtimeData, calendar, loading, onSuccess, onError }) {
  const [rows,   setRows]   = useState([]);
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    if (!workDays?.length || !calendar) return;

    const merged = workDays.map((day) => {
      const existing = overtimeData.find(o => o.work_day_id === day.id);
      return {
        work_day_id:      day.id,
        work_calendar_id: calendar.id,
        day_name_id:      day.day_name_id,
        day_name:         day.day_name,
        is_workday:       day.is_workday,
        overtime_enabled: existing?.overtime_enabled ?? false,
        overtime_end:     existing?.overtime_end?.slice(0, 5) ?? '20:00',
      };
    });

    setRows(merged);
  }, [workDays, overtimeData, calendar]);

  const toggle = (work_day_id) => {
    setRows(prev => prev.map(r =>
      r.work_day_id === work_day_id ? { ...r, overtime_enabled: !r.overtime_enabled } : r
    ));
  };

  const setEnd = (work_day_id, val) => {
    setRows(prev => prev.map(r =>
      r.work_day_id === work_day_id ? { ...r, overtime_end: val } : r
    ));
  };

  const handleSave = async () => {
    for (const r of rows) {
      if (r.overtime_enabled && !r.overtime_end) {
        onError(`Jam selesai lembur wajib diisi untuk ${r.day_name_id}`);
        return;
      }
    }

    setSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/work-day-overtime/batch`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          items: rows.map(r => ({
            work_day_id:      r.work_day_id,
            work_calendar_id: r.work_calendar_id,
            overtime_enabled: r.overtime_enabled,
            overtime_end:     r.overtime_enabled ? r.overtime_end + ':00' : null,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) onSuccess('Lembur per hari berhasil disimpan');
      else              onError(json.message || 'Gagal menyimpan');
    } catch {
      onError('Gagal menyimpan data lembur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-column gap-3">
      {[1,2,3,4,5].map(i => <Skeleton key={i} height="3rem" />)}
    </div>
  );

  return (
    <div className="flex flex-column gap-3">
      {rows.map((row) => (
        <div
          key={row.work_day_id}
          className="flex align-items-center justify-content-between p-3 border-round gap-3"
          style={{
            background: !row.is_workday
              ? 'var(--surface-200)'
              : row.overtime_enabled ? 'var(--orange-50)' : 'var(--surface-100)',
            border: `1px solid ${!row.is_workday
              ? 'var(--surface-400)'
              : row.overtime_enabled ? 'var(--orange-200)' : 'var(--surface-300)'}`,
            opacity: row.is_workday ? 1 : 0.5,
          }}
        >
          <div style={{ minWidth: '80px' }}>
            <div className="font-semibold text-sm">{row.day_name_id}</div>
            <div className="text-xs text-color-secondary">{row.day_name}</div>
            {!row.is_workday && (
              <div className="text-xs mt-1" style={{ color: 'var(--red-400)' }}>Hari libur</div>
            )}
          </div>

          <div className="flex align-items-center gap-3 flex-1 justify-content-end">
            {row.overtime_enabled && row.is_workday && (
              <div className="flex align-items-center gap-2">
                <label className="text-xs text-color-secondary">Selesai lembur</label>
                <InputMask
                  mask="99:99"
                  value={row.overtime_end}
                  onChange={(e) => setEnd(row.work_day_id, e.value)}
                  placeholder="20:00"
                  style={{ width: '90px' }}
                  disabled={!row.is_workday}
                />
              </div>
            )}
            <span className="text-xs" style={{ color: row.overtime_enabled ? 'var(--orange-600)' : 'var(--text-color-secondary)' }}>
              {row.overtime_enabled ? 'Lembur' : 'Tidak lembur'}
            </span>
            <InputSwitch
              checked={Boolean(row.overtime_enabled)}
              onChange={() => toggle(row.work_day_id)}
              disabled={!row.is_workday}
            />
          </div>
        </div>
      ))}

      <Button
        label="Simpan Lembur"
        icon="pi pi-save"
        loading={saving}
        onClick={handleSave}
        className="w-full mt-2"
      />
    </div>
  );
}