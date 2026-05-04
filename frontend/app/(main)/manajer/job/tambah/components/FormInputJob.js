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
  { label: 'Additive Manufacturing', value: 'Additive'  },
  { label: 'Milling',                value: 'Milling'   },
  { label: 'Grinding',               value: 'Grinding'  },
  { label: 'Lathe',                  value: 'Lathe'     },
  { label: 'Drilling',               value: 'Drilling'  },
];

const defaultForm = {
  operation_type:       null,
  machine_id:           null,
  material_id:          null,
  processing_time:      null,
  energy_consumption:   null,
  machine_availability: null,
  deadline_customer:    null,
  scheduled_start:      null,
  material_used:        null,
  is_urgent:            false,
};

const FormInputJob = () => {
  const toast      = useRef(null);
  const router     = useRouter();
  const [machines,     setMachines]     = useState([]);
  const [materials,    setMaterials]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState(defaultForm);
  const [stockWarning, setStockWarning] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMachines, resMaterials] = await Promise.all([
        fetch(`${BASE_URL}/machines`,  { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${BASE_URL}/materials`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      const dataMachines  = await resMachines.json();
      const dataMaterials = await resMaterials.json();

      if (dataMachines.success) {
        setMachines(dataMachines.data
          .filter(m => m.status === 'active')
          .map(m => ({
            label: `${m.machine_id} - ${m.machine_name}`,
            value: m.machine_id,  // ← pakai machine_id string bukan id integer
            data:  m,
          }))
        );
      }
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

  const handleMachineChange = (machineId) => {
    set('machine_id', machineId);
    const selected = machines.find(m => m.value === machineId);
    if (selected?.data) {
      set('energy_consumption',   selected.data.energy_rate          || null);
      set('machine_availability', selected.data.machine_availability || null);
    }
  };

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
    if (!form.machine_id) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Mesin wajib dipilih' });
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
    if (!form.energy_consumption) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Energy consumption wajib diisi' });
      return false;
    }
    if (!form.machine_availability) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Machine availability wajib diisi' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/jobs`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({
          ...form,
          deadline_customer: form.deadline_customer ? form.deadline_customer.toISOString() : null,
          scheduled_start:   form.scheduled_start   ? form.scheduled_start.toISOString()   : null,
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

  const selectedMachine = machines.find(m => m.value === form.machine_id)?.data;

  return (
    <>
      <Toast ref={toast} />

      <div className="grid">
        <div className="col-12 lg:col-8">
          <div className="card">
            <h3 className="mt-0 mb-4">Informasi Job</h3>

            <div className="formgrid grid">

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

              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">
                  Mesin <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  value={form.machine_id}
                  options={machines}
                  onChange={(e) => handleMachineChange(e.value)}
                  placeholder="-- Pilih Mesin --"
                  filter
                  style={{ width: '100%' }}
                  loading={loading}
                />
                {selectedMachine && (
                  <small className="text-color-secondary">
                    Energy Rate: {selectedMachine.energy_rate ?? '-'} kWh |
                    Availability: {selectedMachine.machine_availability ?? '-'}%
                  </small>
                )}
              </div>

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

              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">Material Used</label>
                <InputNumber
                  value={form.material_used}
                  onValueChange={(e) => set('material_used', e.value)}
                  min={0}
                  minFractionDigits={2}
                  placeholder="Jumlah material yang digunakan"
                  style={{ width: '100%' }}
                />
              </div>

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

              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">
                  Energy Consumption (kWh) <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  value={form.energy_consumption}
                  onValueChange={(e) => set('energy_consumption', e.value)}
                  min={2.01} max={14.98}
                  minFractionDigits={2}
                  maxFractionDigits={2}
                  suffix=" kWh"
                  style={{ width: '100%' }}
                />
                <small className="text-color-secondary">Auto-fill dari mesin | Range: 2.01-14.98</small>
              </div>

              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">
                  Machine Availability (%) <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  value={form.machine_availability}
                  onValueChange={(e) => set('machine_availability', e.value)}
                  min={80} max={99}
                  suffix="%"
                  style={{ width: '100%' }}
                />
                <small className="text-color-secondary">Auto-fill dari mesin | Range: 80-99%</small>
              </div>

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

              <div className="field col-12 md:col-6">
                <label className="font-bold block mb-2">Rencana Mulai</label>
                <Calendar
                  value={form.scheduled_start}
                  onChange={(e) => set('scheduled_start', e.value)}
                  showTime hourFormat="24"
                  showIcon
                  minDate={new Date()}
                  placeholder="Pilih waktu mulai"
                  style={{ width: '100%' }}
                />
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
              { label: 'Mesin',           value: machines.find(m => m.value === form.machine_id)?.label || '-' },
              { label: 'Processing Time', value: form.processing_time ? `${form.processing_time} menit` : '-' },
              { label: 'Energy',          value: form.energy_consumption ? `${form.energy_consumption} kWh` : '-' },
              { label: 'Availability',    value: form.machine_availability ? `${form.machine_availability}%` : '-' },
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
              { icon: 'pi-cog',      color: '#f59e0b', text: 'Pilih mesin aktif, energy dan availability auto-fill' },
              { icon: 'pi-clock',    color: '#22c55e', text: 'Processing time harus 20-120 menit sesuai dataset' },
              { icon: 'pi-calendar', color: '#3b82f6', text: 'Deadline opsional, sistem prediksi otomatis via Random Forest' },
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