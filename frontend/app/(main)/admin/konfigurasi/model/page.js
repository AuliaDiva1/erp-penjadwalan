'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ModelPrediksiPage() {
  const toast    = useRef(null);
  const [model, setModel]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [resetting, setResetting] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchModel = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/dashboard/admin/model-rf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setModel(json.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat info model' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModel(); }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/model/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Model prediksi berhasil direset' });
        fetchModel();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal mereset model' });
    } finally {
      setResetting(false);
    }
  };

  const getR2Color = (r2) => {
    if (!r2) return '#64748b';
    if (r2 >= 0.9) return '#22c55e';
    if (r2 >= 0.7) return '#f59e0b';
    return '#ef4444';
  };

  const getR2Label = (r2) => {
    if (!r2) return { label: 'Tidak diketahui', severity: 'secondary' };
    if (r2 >= 0.9) return { label: 'Sangat Baik', severity: 'success' };
    if (r2 >= 0.7) return { label: 'Baik', severity: 'info' };
    if (r2 >= 0.5) return { label: 'Cukup', severity: 'warning' };
    return { label: 'Kurang', severity: 'danger' };
  };

  return (
    <div>
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Model Prediksi Deadline (Random Forest)</h2>
          <p className="m-0 text-color-secondary text-sm">
            Pantau performa model Random Forest dan reset jika diperlukan
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon="pi pi-refresh" text onClick={fetchModel} loading={loading} tooltip="Refresh" />
          <Button
            label={resetting ? 'Mereset...' : 'Reset Model'}
            icon={resetting ? 'pi pi-spin pi-spinner' : 'pi pi-undo'}
            severity="warning"
            onClick={handleReset}
            disabled={resetting}
          />
        </div>
      </div>

      {/* INFO BANNER */}
      <div
        className="card p-4 mb-4 flex align-items-start gap-3"
        style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
      >
        <i className="pi pi-info-circle mt-1" style={{ color: '#3b82f6', fontSize: '1.2rem' }} />
        <div className="text-sm" style={{ color: '#1e40af' }}>
          <b>Cara kerja model prediksi:</b> Model Random Forest dilatih secara offline
          menggunakan dataset Hybrid Manufacturing Production Data dari Kaggle (1.000 data job).
          Model mempelajari pola historis untuk memprediksi durasi aktual job baru secara otomatis
          berdasarkan Processing Time, Energy Consumption, Machine Availability, dan Operation Type.
          Reset model diperlukan jika performa menurun atau data historis sudah berubah signifikan.
        </div>
      </div>

      {loading ? (
        <div className="card flex justify-content-center align-items-center p-6">
          <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
        </div>
      ) : model ? (
        <div className="grid">

          {/* STATUS MODEL */}
          <div className="col-12 lg:col-8">
            <div className="card">
              <h3 className="mt-0 mb-4">Status Model</h3>

              <div className="grid mb-4">
                {[
                  { label: 'Nama Model',    value: model.nama_model || 'Random Forest Regressor' },
                  { label: 'Versi',         value: model.versi      || '-' },
                  { label: 'Status',        value: model.is_active  ? 'Aktif' : 'Tidak Aktif' },
                  { label: 'Terlatih Pada', value: model.trained_at ? new Date(model.trained_at).toLocaleString('id-ID') : '-' },
                ].map((item, i) => (
                  <div key={i} className="col-12 md:col-6">
                    <div
                      className="p-3 border-round"
                      style={{ background: 'var(--surface-ground)' }}
                    >
                      <div className="text-color-secondary text-xs mb-1">{item.label}</div>
                      <div className="font-semibold">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mb-3">Metrik Evaluasi Model</h3>
              <div className="grid">

                {/* R² Score */}
                <div className="col-12 md:col-4">
                  <div className="card p-4 text-center" style={{ borderLeft: `4px solid ${getR2Color(model.r2_score)}` }}>
                    <div className="text-3xl font-bold mb-1" style={{ color: getR2Color(model.r2_score) }}>
                      {model.r2_score ? (model.r2_score * 100).toFixed(1) + '%' : '-'}
                    </div>
                    <div className="text-color-secondary text-sm mb-2">R² Score</div>
                    {model.r2_score && (
                      <Tag value={getR2Label(model.r2_score).label} severity={getR2Label(model.r2_score).severity} />
                    )}
                    <div className="mt-2">
                      <ProgressBar
                        value={model.r2_score ? model.r2_score * 100 : 0}
                        showValue={false}
                        style={{ height: '6px' }}
                        color={getR2Color(model.r2_score)}
                      />
                    </div>
                  </div>
                </div>

                {/* MAE */}
                <div className="col-12 md:col-4">
                  <div className="card p-4 text-center" style={{ borderLeft: '4px solid #6366f1' }}>
                    <div className="text-3xl font-bold mb-1" style={{ color: '#6366f1' }}>
                      {model.mae ? model.mae.toFixed(2) : '-'}
                    </div>
                    <div className="text-color-secondary text-sm mb-1">MAE</div>
                    <div className="text-xs text-color-secondary">Mean Absolute Error (menit)</div>
                  </div>
                </div>

                {/* RMSE */}
                <div className="col-12 md:col-4">
                  <div className="card p-4 text-center" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="text-3xl font-bold mb-1" style={{ color: '#f59e0b' }}>
                      {model.rmse ? model.rmse.toFixed(2) : '-'}
                    </div>
                    <div className="text-color-secondary text-sm mb-1">RMSE</div>
                    <div className="text-xs text-color-secondary">Root Mean Squared Error (menit)</div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* KOLOM KANAN - Panduan */}
          <div className="col-12 lg:col-4">
            <div className="card mb-4">
              <h3 className="mt-0 mb-3">Kapan Perlu Reset?</h3>
              {[
                { icon: 'pi-exclamation-triangle', color: '#ef4444', text: 'R² Score di bawah 0.7 (70%)' },
                { icon: 'pi-clock',                color: '#f59e0b', text: 'MAE lebih dari 30 menit' },
                { icon: 'pi-database',             color: '#6366f1', text: 'Data historis bertambah signifikan' },
                { icon: 'pi-refresh',              color: '#22c55e', text: 'Ada perubahan jenis operasi baru' },
              ].map((item, i) => (
                <div key={i} className="flex align-items-start gap-2 mb-3">
                  <i className={`pi ${item.icon} mt-1`} style={{ color: item.color, fontSize: '1rem' }} />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="mt-0 mb-3">Fitur Input Model</h3>
              {[
                'Processing Time (menit)',
                'Energy Consumption (kWh)',
                'Machine Availability (%)',
                'Operation Type (kategori)',
              ].map((f, i) => (
                <div key={i} className="flex align-items-center gap-2 mb-2">
                  <i className="pi pi-check-circle" style={{ color: '#22c55e' }} />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
              <div className="mt-3 text-xs text-color-secondary">
                Output: Predicted Duration → Deadline otomatis
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="card flex flex-column align-items-center justify-content-center p-6 gap-3">
          <i className="pi pi-cog" style={{ fontSize: '3rem', color: '#64748b' }} />
          <h3 className="m-0">Model Belum Tersedia</h3>
          <p className="m-0 text-color-secondary text-sm text-center">
            Model Random Forest belum dilatih. Jalankan script training Python
            terlebih dahulu untuk menghasilkan model prediksi deadline.
          </p>
        </div>
      )}
    </div>
  );
}