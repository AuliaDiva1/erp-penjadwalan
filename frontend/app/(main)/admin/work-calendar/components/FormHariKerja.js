'use client';
import { useState, useEffect } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { Button }      from 'primereact/button';
import { Skeleton }    from 'primereact/skeleton';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function FormHariKerja({ data, loading, onSuccess, onError }) {
  const [days,   setDays]   = useState([]);
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    if (data?.length) setDays(data.map(d => ({ ...d })));
  }, [data]);

  const toggleDay = (id) => {
    setDays(prev => prev.map(d =>
      d.id === id ? { ...d, is_workday: !d.is_workday } : d
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/work-calendar/days`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          work_days: days.map(d => ({ id: d.id, is_workday: d.is_workday })),
        }),
      });
      const json = await res.json();
      if (json.success) onSuccess('Hari kerja berhasil diperbarui');
      else              onError(json.message || 'Gagal menyimpan');
    } catch {
      onError('Gagal menyimpan hari kerja');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-column gap-3">
      {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} height="2.5rem" />)}
    </div>
  );

  return (
    <div className="flex flex-column gap-3">
      {days.map((day) => (
        <div
          key={day.id}
          className="flex align-items-center justify-content-between p-3 border-round"
          style={{
            background: day.is_workday ? 'var(--green-50)' : 'var(--surface-100)',
            border: `1px solid ${day.is_workday ? 'var(--green-200)' : 'var(--surface-300)'}`,
          }}
        >
          <div>
            <div className="font-semibold text-sm">{day.day_name_id}</div>
            <div className="text-xs text-color-secondary">{day.day_name}</div>
          </div>
          <div className="flex align-items-center gap-2">
            <span className="text-xs" style={{ color: day.is_workday ? 'var(--green-600)' : 'var(--text-color-secondary)' }}>
              {day.is_workday ? 'Hari Kerja' : 'Libur'}
            </span>
            <InputSwitch
              checked={Boolean(day.is_workday)}
              onChange={() => toggleDay(day.id)}
            />
          </div>
        </div>
      ))}

      <Button
        label="Simpan Hari Kerja"
        icon="pi pi-save"
        loading={saving}
        onClick={handleSave}
        className="w-full mt-2"
      />
    </div>
  );
}