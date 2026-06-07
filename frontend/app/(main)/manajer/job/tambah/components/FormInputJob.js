'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const OPERATION_TYPES = [
  { label: 'Additive Manufacturing', value: 'Additive' },
  { label: 'Milling',                value: 'Milling'  },
  { label: 'Grinding',               value: 'Grinding' },
  { label: 'Lathe',                  value: 'Lathe'    },
  { label: 'Drilling',               value: 'Drilling' },
];

const defaultForm = {
  operation_type:    null,
  material_id:       null,
  processing_time:   null,
  deadline_customer: null,
  material_used:     null,
  is_urgent:         false,
};

const FormInputJob = () => {
  const toast      = useRef(null);
  const router     = useRouter();
  const [materials,    setMaterials]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState(defaultForm);
  const [stockWarning, setStockWarning] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchData = async () => {
    setLoading(true);
    try {
      const resMaterials = await fetch(`${BASE_URL}/materials`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const dataMaterials = await resMaterials.json();
      if (dataMaterials.success) {
        setMaterials(dataMaterials.data.map(m => ({
          label: `${m.kode_bahan_baku} - ${m.material_name} (stok: ${m.current_stock} ${m.nama_satuan})`,
          value: m.id,
          data:  m,
        })));
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleMaterialChange = (materialId) => {
    set('material_id', materialId);
    setStockWarning(null);
    const selected = materials.find(m => m.value === materialId);
    if (selected?.data && selected.data.current_stock <= selected.data.min_stock_level) {
      setStockWarning(`Stok ${selected.data.material_name} hampir habis: ${selected.data.current_stock} ${selected.data.nama_satuan}`);
    }
  };

  const validate = () => {
    if (!form.operation_type) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Operation type wajib dipilih' });
      return false;
    }
    if (!form.processing_time) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Processing time wajib diisi' });
      return false;
    }
    if (form.processing_time < 20 || form.processing_time > 120) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Processing time harus antara 20-120 menit' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/jobs`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({
          operation_type:    form.operation_type,
          material_id:       form.material_id,
          processing_time:   form.processing_time,
          material_used:     form.material_used,
          is_urgent:         form.is_urgent,
          machine_id:        null,
          deadline_customer: form.deadline_customer ? form.deadline_customer.toISOString() : null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.current.show({
          severity: 'success',
          summary:  'Berhasil',
          detail:   `Job ${data.data?.job_id || ''} berhasil ditambahkan dengan status Pending`,
        });
        setTimeout(() => router.push('/manajer/job/riwayat'), 1500);
      } else if (data.stockInsufficient) {
        toast.current.show({
          severity: 'warn',
          summary:  'Stok Tidak Cukup',
          detail:   data.message,
          life:     8000,
        });
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal menyimpan job' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(defaultForm);
    setStockWarning(null);
  };

  return (
    <>
      <Toast ref={toast} />

      <div className="grid">
        <div className="col-12 lg:col-8">
          <div className="card">
            <h3 className="mt-0 mb-4">Informasi Job</h3>

            <div className="formgrid grid">

              {/* Operation Type */}
              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">
                  Operation Type <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  value={form.operation_type}
                  options={OPERATION_TYPES}
                  onChange={(e) => set('operation_type', e.value)}
                  placeholder="-- Pilih Jenis Operasi --"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Tingkat Urgensi Job — dipindah berpasangan dengan Operation Type */}
              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">Tingkat Urgensi Job</label>
                <div
                  className="flex gap-3"
                  style={{
                    border: '1px solid var(--surface-border)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--surface-ground)',
                    height: '2.857rem',
                    alignItems: 'center',
                  }}
                >
                  <label
                    className="flex align-items-center gap-2 cursor-pointer"
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      background: form.is_urgent === true ? '#fef3c7' : 'transparent',
                      border: form.is_urgent === true ? '1px solid #f59e0b' : '1px solid transparent',
                      color: form.is_urgent === true ? '#b45309' : 'inherit',
                      fontWeight: form.is_urgent === true ? '600' : 'normal',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="is_urgent"
                      checked={form.is_urgent === true}
                      onChange={() => set('is_urgent', true)}
                    />
                    <i className="pi pi-bolt" style={{ fontSize: '0.8rem' }} />
                    Urgent
                  </label>
                  <label
                    className="flex align-items-center gap-2 cursor-pointer"
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      background: form.is_urgent === false ? '#f0fdf4' : 'transparent',
                      border: form.is_urgent === false ? '1px solid #22c55e' : '1px solid transparent',
                      color: form.is_urgent === false ? '#15803d' : 'inherit',
                      fontWeight: form.is_urgent === false ? '600' : 'normal',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="is_urgent"
                      checked={form.is_urgent === false}
                      onChange={() => set('is_urgent', false)}
                    />
                    Normal
                  </label>
                </div>
                <small className="text-color-secondary">Tingkat prioritas pemrosesan job ini</small>
              </div>

              {/* Bahan Baku */}
              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">Bahan Baku</label>
                <Dropdown
                  value={form.material_id}
                  options={materials}
                  onChange={(e) => handleMaterialChange(e.value)}
                  placeholder="-- Pilih Bahan Baku --"
                  filter
                  style={{ width: '100%' }}
                  loading={loading}
                />
                {stockWarning && (
                  <small className="text-orange-500">{stockWarning}</small>
                )}
              </div>

              {/* Material Used */}
              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">Jumlah Material Digunakan</label>
                <InputNumber
                  value={form.material_used}
                  onValueChange={(e) => set('material_used', e.value)}
                  min={0}
                  minFractionDigits={2}
                  placeholder="Jumlah material yang digunakan"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Processing Time */}
              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">
                  Processing Time (menit) <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  value={form.processing_time}
                  onValueChange={(e) => set('processing_time', e.value)}
                  min={20} max={120}
                  showButtons
                  suffix=" menit"
                  style={{ width: '100%' }}
                />
                <small className="text-color-secondary">Min: 20 | Max: 120 menit</small>
              </div>

              {/* Deadline Customer — sekarang berdiri sendiri, tidak berdekatan dengan urgensi */}
              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">Deadline Customer</label>
                <Calendar
                  value={form.deadline_customer}
                  onChange={(e) => set('deadline_customer', e.value)}
                  showTime hourFormat="24"
                  showIcon
                  minDate={new Date()}
                  placeholder="Pilih deadline customer"
                  style={{ width: '100%' }}
                />
                <small className="text-color-secondary">Opsional — sistem prediksi otomatis jika kosong</small>
              </div>

            </div>

            <div className="flex justify-content-end gap-2 mt-4">
              <Button
                label="Reset"
                icon="pi pi-undo"
                severity="secondary"
                text
                onClick={handleReset}
                disabled={saving}
              />
              <Button
                label={saving ? 'Menyimpan...' : 'Simpan Job'}
                icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                onClick={handleSubmit}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* PANEL KANAN */}
        <div className="col-12 lg:col-4">
          <div className="card mb-4">
            <h3 className="mt-0 mb-3">Preview Job</h3>
            {[
              { label: 'Operation Type',  value: form.operation_type || '-' },
              { label: 'Mesin',           value: 'Ditentukan otomatis oleh CCEA' },
              { label: 'Processing Time', value: form.processing_time ? `${form.processing_time} menit` : '-' },
              { label: 'Energy',          value: 'Otomatis dari sistem' },
              { label: 'Availability',    value: 'Otomatis dari sistem' },
              { label: 'Tingkat Urgensi', value: form.is_urgent ? '⚡ Urgent' : '✅ Normal' },
              { label: 'Deadline',        value: form.deadline_customer ? new Date(form.deadline_customer).toLocaleString('id-ID') : 'Prediksi otomatis' },
              { label: 'Status Awal',     value: 'Pending' },
            ].map((item, i) => (
              <div key={i} className="flex justify-content-between align-items-center py-2"
                style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span className="text-color-secondary text-sm">{item.label}</span>
                <span className="font-semibold text-sm">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="mt-0 mb-3">Panduan Pengisian</h3>
            {[
              { icon: 'pi-star',     color: '#6366f1', text: 'Operation Type menentukan bobot prioritas Fuzzy Mamdani' },
              { icon: 'pi-bolt',     color: '#f59e0b', text: 'Tingkat Urgensi Job menentukan prioritas pemrosesan — Urgent berarti job didahulukan dalam antrian' },
              { icon: 'pi-cog',      color: '#8b5cf6', text: 'Mesin ditentukan otomatis oleh algoritma CCEA saat pipeline dijalankan' },
              { icon: 'pi-clock',    color: '#22c55e', text: 'Processing time harus 20-120 menit sesuai dataset' },
              { icon: 'pi-database', color: '#3b82f6', text: 'Energy consumption & machine availability diisi otomatis sistem berdasarkan jenis operasi' },
              { icon: 'pi-calendar', color: '#06b6d4', text: 'Deadline opsional, sistem prediksi otomatis via Random Forest' },
              { icon: 'pi-play',     color: '#ef4444', text: 'Setelah disimpan, jalankan pipeline untuk mendapat jadwal optimal' },
            ].map((item, i) => (
              <div key={i} className="flex align-items-start gap-2 mb-3">
                <i className={`pi ${item.icon} mt-1`} style={{ color: item.color, fontSize: '0.9rem' }} />
                <span className="text-xs text-color-secondary">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default FormInputJob;
