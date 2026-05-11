'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Bobot sudah disesuaikan: Lathe tertinggi (1.20) dan Drilling terendah (0.95)
const DEFAULT_BOBOT = {
  Lathe:    1.20,
  Milling:  1.10,
  Grinding: 1.08,
  Additive: 0.98,
  Drilling: 0.95,
};

const DESKRIPSI = {
  Lathe:    'Prioritas Utama: Sering mengalami keterlambatan/kegagalan hasil produksi.',
  Milling:  'Presisi tinggi, memerlukan pengawasan pada variasi material.',
  Grinding: 'Memerlukan kontrol kecepatan dan pendinginan yang ketat.',
  Additive: 'Proses kompleks namun tingkat keberhasilan relatif stabil.',
  Drilling: 'Paling sederhana, waktu proses pendek dan sangat fleksibel.',
};

export default function FuzzyBobotPage() {
  const toast    = useRef(null);
  const [config, setConfig]   = useState(null);
  const [bobot, setBobot]     = useState(DEFAULT_BOBOT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [isEdit, setIsEdit]   = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/konfigurasi/fuzzy`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data);
        setBobot(json.data.bobot_operation_type);
        setIsEdit(true);
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat konfigurasi' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url    = isEdit ? `${BASE_URL}/konfigurasi/fuzzy/${config.id}` : `${BASE_URL}/konfigurasi/fuzzy`;
      const method = isEdit ? 'PUT' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          fuzzy_rules:          config?.fuzzy_rules          || [],
          membership_functions: config?.membership_functions || {},
          bobot_operation_type: bobot,
          versi: `v${new Date().toISOString().slice(0, 10)}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Bobot Operation Type disimpan' });
        fetchConfig();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal menyimpan bobot' });
    } finally {
      setSaving(false);
    }
  };

  const getBobotSeverity = (val) => {
    if (val >= 1.15) return 'danger';
    if (val >= 1.05) return 'warning';
    if (val >= 1.00) return 'info';
    return 'success';
  };

  return (
    <div>
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Konfigurasi Fuzzy Mamdani — Bobot Operation Type</h2>
          <p className="m-0 text-color-secondary text-sm">
            Atur bobot pengali skor prioritas berdasarkan jenis operasi mesin
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon="pi pi-refresh" text onClick={fetchConfig} loading={loading} tooltip="Refresh" />
          <Button
            label={saving ? 'Menyimpan...' : 'Simpan Bobot'}
            icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
            onClick={handleSave}
            disabled={saving}
          />
        </div>
      </div>

      {config && (
        <div className="card p-3 mb-4" style={{ background: 'var(--surface-ground)' }}>
          <div className="flex gap-4 text-sm">
            <span>Versi aktif: <b>{config.versi || '-'}</b></span>
            <span>Diperbarui oleh: <b>{config.updated_by || '-'}</b></span>
          </div>
        </div>
      )}

      <div className="card">
        <p className="text-color-secondary text-sm mb-4">
          Bobot pengali digunakan untuk menyesuaikan skor prioritas Fuzzy Mamdani
          berdasarkan tingkat kompleksitas teknis setiap jenis operasi mesin.
          Skor Final = Skor Fuzzy × Bobot Operation Type.
        </p>

        <div className="grid">
          {/* Mapping data sesuai urutan bobot tertinggi */}
          {Object.entries(bobot).sort((a, b) => b[1] - a[1]).map(([op, val]) => (
            <div key={op} className="col-12 md:col-6 lg:col-4">
              <div
                className="p-4 border-round mb-3"
                style={{ border: '1px solid var(--surface-border)' }}
              >
                <div className="flex justify-content-between align-items-center mb-2">
                  <span className="font-semibold text-lg">{op}</span>
                  <Tag value={`×${val.toFixed(2)}`} severity={getBobotSeverity(val)} />
                </div>
                <p className="text-color-secondary text-sm m-0 mb-3" style={{ minHeight: '35px' }}>
                  {DESKRIPSI[op]}
                </p>
                <InputNumber
                  value={val}
                  onValueChange={(e) => setBobot(prev => ({ ...prev, [op]: e.value }))}
                  mode="decimal"
                  minFractionDigits={2}
                  maxFractionDigits={2}
                  min={0.5}
                  max={2.0}
                  step={0.01}
                  showButtons
                  style={{ width: '100%' }}
                />
                <small className="text-color-secondary">Min: 0.50 | Max: 2.00</small>
              </div>
            </div>
          ))}
        </div>

        {/* Visualisasi Urutan di Bagian Bawah */}
        <div className="p-3 border-round mt-2" style={{ background: 'var(--surface-ground)' }}>
          <div className="text-sm font-semibold mb-2">Urutan Prioritas Saat Ini:</div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(bobot)
              .sort((a, b) => b[1] - a[1])
              .map(([op, val], i) => (
                <div key={op} className="flex align-items-center gap-1 text-sm">
                  <span className="text-color-secondary">{i + 1}.</span>
                  <span className="font-semibold">{op}</span>
                  <span className="text-color-secondary">(×{val.toFixed(2)})</span>
                  {i < Object.keys(bobot).length - 1 && <span className="text-color-secondary mx-1">→</span>}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}