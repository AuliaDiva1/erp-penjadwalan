'use client';
import { useState, useEffect } from 'react';
import { InputMask }  from 'primereact/inputmask';
import { Button }     from 'primereact/button';
import { Skeleton }   from 'primereact/skeleton';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function FormJamKerja({ data, loading, onSuccess, onError }) {
  const [form,   setForm]   = useState({ work_start: '08:00', work_end: '17:00' });
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    if (data) {
      setForm({
        work_start: data.work_start?.slice(0, 5) || '08:00',
        work_end:   data.work_end?.slice(0, 5)   || '17:00',
      });
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/work-calendar`, {
        method:  'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          work_start:       form.work_start + ':00',
          work_end:         form.work_end   + ':00',
          overtime_enabled: false,
          overtime_end:     null,
        }),
      });
      const json = await res.json();
      if (json.success) onSuccess('Jam kerja berhasil diperbarui');
      else              onError(json.message || 'Gagal menyimpan');
    } catch {
      onError('Gagal menyimpan jam kerja');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-column gap-3">
      {[1, 2].map(i => <Skeleton key={i} height="2.5rem" />)}
    </div>
  );

  return (
    <div className="flex flex-column gap-4">

      <div className="flex flex-column gap-2">
        <label className="font-semibold text-sm">Jam Mulai Kerja</label>
        <InputMask
          mask="99:99"
          value={form.work_start}
          onChange={(e) => setForm(p => ({ ...p, work_start: e.value }))}
          placeholder="08:00"
          className="w-full"
        />
      </div>

      <div className="flex flex-column gap-2">
        <label className="font-semibold text-sm">Jam Selesai Kerja</label>
        <InputMask
          mask="99:99"
          value={form.work_end}
          onChange={(e) => setForm(p => ({ ...p, work_end: e.value }))}
          placeholder="17:00"
          className="w-full"
        />
      </div>

      <p className="text-xs text-color-secondary m-0">
        * Jam lembur diatur per hari di bagian <strong>Lembur per Hari</strong> di bawah.
      </p>

      <Button
        label="Simpan Jam Kerja"
        icon="pi pi-save"
        loading={saving}
        onClick={handleSave}
        className="w-full mt-2"
      />
    </div>
  );
}