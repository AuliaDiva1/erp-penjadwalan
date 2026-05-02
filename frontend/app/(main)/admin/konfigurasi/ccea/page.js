'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Slider } from 'primereact/slider';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const DEKOMPOSISI_OPTIONS = [
  { label: 'Random Grouping',   value: 'random'   },
  { label: 'Static Grouping',   value: 'static'   },
  { label: 'Adaptive (SADS)',   value: 'adaptive' },
];

const DEFAULT_CONFIG = {
  jumlah_populasi: 50,
  jumlah_iterasi:  100,
  dekomposisi:     'random',
  crossover_rate:  0.80,
  mutation_rate:   0.10,
  versi:           '',
};

export default function KonfigurasiCCEAPage() {
  const toast    = useRef(null);
  const [config, setConfig]     = useState(null);
  const [form, setForm]         = useState(DEFAULT_CONFIG);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [isEdit, setIsEdit]     = useState(false);
  const [riwayat, setRiwayat]   = useState([]);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const [resAktif, resRiwayat] = await Promise.all([
        fetch(`${BASE_URL}/konfigurasi/ccea`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${BASE_URL}/konfigurasi/ccea/semua`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const jsonAktif    = await resAktif.json();
      const jsonRiwayat  = await resRiwayat.json();

      if (jsonAktif.success && jsonAktif.data) {
        setConfig(jsonAktif.data);
        setForm({
          jumlah_populasi: jsonAktif.data.jumlah_populasi,
          jumlah_iterasi:  jsonAktif.data.jumlah_iterasi,
          dekomposisi:     jsonAktif.data.dekomposisi,
          crossover_rate:  jsonAktif.data.crossover_rate,
          mutation_rate:   jsonAktif.data.mutation_rate,
          versi:           jsonAktif.data.versi || '',
        });
        setIsEdit(true);
      }

      if (jsonRiwayat.success) setRiwayat(jsonRiwayat.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat konfigurasi CCEA' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const url    = isEdit ? `${BASE_URL}/konfigurasi/ccea/${config.id}` : `${BASE_URL}/konfigurasi/ccea`;
      const method = isEdit ? 'PUT' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...form,
          versi: form.versi || `v${new Date().toISOString().slice(0, 10)}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Konfigurasi CCEA berhasil disimpan' });
        fetchConfig();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal menyimpan konfigurasi CCEA' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_CONFIG);
    toast.current.show({ severity: 'info', summary: 'Reset', detail: 'Form dikembalikan ke nilai default' });
  };

  return (
    <div>
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Konfigurasi Parameter CCEA</h2>
          <p className="m-0 text-color-secondary text-sm">
            Atur parameter Cooperative Co-Evolution Algorithm untuk optimasi penjadwalan
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon="pi pi-refresh" text onClick={fetchConfig} loading={loading} tooltip="Refresh" />
          <Button label="Reset Default" icon="pi pi-undo" severity="secondary" text onClick={handleReset} />
          <Button
            label={saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
            onClick={handleSave}
            disabled={saving}
          />
        </div>
      </div>

      {config && (
        <div className="card p-3 mb-4" style={{ background: 'var(--surface-ground)' }}>
          <div className="flex gap-4 text-sm flex-wrap">
            <span>Versi aktif: <b>{config.versi || '-'}</b></span>
            <span>Diperbarui oleh: <b>{config.updated_by || '-'}</b></span>
            <span>Tanggal: <b>{config.updated_at ? new Date(config.updated_at).toLocaleString('id-ID') : '-'}</b></span>
          </div>
        </div>
      )}

      <div className="grid">

        {/* KOLOM KIRI - Form */}
        <div className="col-12 lg:col-8">
          <div className="card">
            <h3 className="mt-0 mb-4">Parameter Utama</h3>

            {/* Populasi & Iterasi */}
            <div className="formgrid grid mb-4">
              <div className="field col-6">
                <label className="font-bold block mb-2">
                  Jumlah Populasi <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  value={form.jumlah_populasi}
                  onValueChange={(e) => set('jumlah_populasi', e.value)}
                  min={10} max={500}
                  showButtons
                  style={{ width: '100%' }}
                />
                <small className="text-color-secondary">Rekomendasi: 50 | Min: 10 | Max: 500</small>
              </div>

              <div className="field col-6">
                <label className="font-bold block mb-2">
                  Jumlah Iterasi <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  value={form.jumlah_iterasi}
                  onValueChange={(e) => set('jumlah_iterasi', e.value)}
                  min={10} max={1000}
                  showButtons
                  style={{ width: '100%' }}
                />
                <small className="text-color-secondary">Rekomendasi: 100 | Min: 10 | Max: 1000</small>
              </div>
            </div>

            {/* Dekomposisi */}
            <div className="field mb-4">
              <label className="font-bold block mb-2">
                Strategi Dekomposisi <span className="text-red-500">*</span>
              </label>
              <Dropdown
                value={form.dekomposisi}
                options={DEKOMPOSISI_OPTIONS}
                onChange={(e) => set('dekomposisi', e.value)}
                style={{ width: '100%' }}
              />
              <small className="text-color-secondary">
                {form.dekomposisi === 'random'   && 'Memilih variabel secara acak ke sub-komponen setiap siklus'}
                {form.dekomposisi === 'static'   && 'Memecah variabel berdasarkan aturan tetap sebelum evolusi dimulai'}
                {form.dekomposisi === 'adaptive' && 'SADS: Secara dinamis menyesuaikan pengelompokan berdasarkan kontribusi'}
              </small>
            </div>

            {/* Crossover Rate */}
            <div className="field mb-4">
              <label className="font-bold block mb-2">
                Crossover Rate: <b>{(form.crossover_rate * 100).toFixed(0)}%</b>
              </label>
              <Slider
                value={form.crossover_rate * 100}
                onChange={(e) => set('crossover_rate', e.value / 100)}
                min={10} max={100} step={5}
                style={{ width: '100%' }}
              />
              <div className="flex justify-content-between mt-1">
                <small className="text-color-secondary">10%</small>
                <small className="text-color-secondary">Rekomendasi: 80%</small>
                <small className="text-color-secondary">100%</small>
              </div>
            </div>

            {/* Mutation Rate */}
            <div className="field mb-4">
              <label className="font-bold block mb-2">
                Mutation Rate: <b>{(form.mutation_rate * 100).toFixed(0)}%</b>
              </label>
              <Slider
                value={form.mutation_rate * 100}
                onChange={(e) => set('mutation_rate', e.value / 100)}
                min={1} max={50} step={1}
                style={{ width: '100%' }}
              />
              <div className="flex justify-content-between mt-1">
                <small className="text-color-secondary">1%</small>
                <small className="text-color-secondary">Rekomendasi: 10%</small>
                <small className="text-color-secondary">50%</small>
              </div>
            </div>

            {/* Versi */}
            <div className="field mb-0">
              <label className="font-bold block mb-2">Label Versi</label>
              <InputText
                value={form.versi}
                onChange={(e) => set('versi', e.target.value)}
                placeholder="Contoh: v1.0, v2025-05"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* KOLOM KANAN - Ringkasan & Riwayat */}
        <div className="col-12 lg:col-4">

          {/* Ringkasan */}
          <div className="card mb-4">
            <h3 className="mt-0 mb-3">Ringkasan Konfigurasi</h3>
            {[
              { label: 'Populasi',     value: form.jumlah_populasi,                    unit: 'individu' },
              { label: 'Iterasi',      value: form.jumlah_iterasi,                     unit: 'generasi' },
              { label: 'Dekomposisi',  value: DEKOMPOSISI_OPTIONS.find(d => d.value === form.dekomposisi)?.label, unit: '' },
              { label: 'Crossover',    value: `${(form.crossover_rate * 100).toFixed(0)}%`, unit: '' },
              { label: 'Mutation',     value: `${(form.mutation_rate * 100).toFixed(0)}%`,  unit: '' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-content-between align-items-center py-2"
                style={{ borderBottom: '1px solid var(--surface-border)' }}
              >
                <span className="text-color-secondary text-sm">{item.label}</span>
                <span className="font-semibold text-sm">{item.value} {item.unit}</span>
              </div>
            ))}

            <div className="mt-3 p-2 border-round text-sm" style={{ background: 'var(--surface-ground)' }}>
              <div className="text-color-secondary mb-1">Estimasi kompleksitas:</div>
              <b>{(form.jumlah_populasi * form.jumlah_iterasi).toLocaleString()}</b> evaluasi fitness
            </div>
          </div>

          {/* Riwayat */}
          <div className="card">
            <h3 className="mt-0 mb-3">Riwayat Konfigurasi</h3>
            {riwayat.length === 0 ? (
              <p className="text-color-secondary text-sm">Belum ada riwayat</p>
            ) : (
              riwayat.slice(0, 5).map((r, i) => (
                <div
                  key={i}
                  className="py-2"
                  style={{ borderBottom: '1px solid var(--surface-border)' }}
                >
                  <div className="flex justify-content-between align-items-center">
                    <span className="font-semibold text-sm">{r.versi || '-'}</span>
                    <Tag value={r.is_active ? 'Aktif' : 'Lama'} severity={r.is_active ? 'success' : 'secondary'} />
                  </div>
                  <div className="text-xs text-color-secondary mt-1">
                    Pop: {r.jumlah_populasi} | Iter: {r.jumlah_iterasi} | {r.dekomposisi}
                  </div>
                  <div className="text-xs text-color-secondary">
                    {r.updated_by || '-'} · {r.updated_at ? new Date(r.updated_at).toLocaleDateString('id-ID') : '-'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}