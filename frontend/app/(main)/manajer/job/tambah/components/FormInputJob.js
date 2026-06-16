'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const defaultForm = {
  operation_type:    null,
  material_id:       null,
  material_used:     null,
  deadline_customer: null,
  is_urgent:         false,
};

const toLocalDatetimeString = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const FormInputJob = () => {
  const toast     = useRef(null);
  const routerNav = useRouter();

  const [form,             setForm]             = useState(defaultForm);
  const [saving,           setSaving]           = useState(false);
  const [operationTypes,   setOperationTypes]   = useState([]);
  const [bahanBakuOptions, setBahanBakuOptions] = useState([]);
  const [loadingBahan,     setLoadingBahan]     = useState(false);
  const [stockWarning,     setStockWarning]     = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    const fetchOperationTypes = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/operation-types`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          setOperationTypes(data.data.map(op => ({
            label:               op.nama_operasi,
            value:               op.id,
            max_processing_time: op.max_processing_time,
            base_time:           op.base_time,
            time_per_unit:       op.time_per_unit,
          })));
        }
      } catch {
        toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat jenis operasi' });
      }
    };
    fetchOperationTypes();
  }, []);

  useEffect(() => {
    if (!form.operation_type) {
      setBahanBakuOptions([]);
      set('material_id', null);
      return;
    }
    const fetchBahanBaku = async () => {
      setLoadingBahan(true);
      setBahanBakuOptions([]);
      set('material_id', null);
      setStockWarning(null);
      try {
        const res  = await fetch(
          `${BASE_URL}/materials?operation_type_id=${form.operation_type}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const data = await res.json();
        if (data.success) {
          setBahanBakuOptions(data.data.map(m => ({
            label: `${m.kode_bahan_baku} - ${m.material_name} (stok: ${m.current_stock} ${m.nama_satuan})`,
            value: m.id,
            data:  m,
          })));
        }
      } catch {
        toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat bahan baku' });
      } finally {
        setLoadingBahan(false);
      }
    };
    fetchBahanBaku();
  }, [form.operation_type]);

  const selectedOpType = operationTypes.find(op => op.value === form.operation_type);
  const maxMaterial = selectedOpType?.base_time && selectedOpType?.time_per_unit
    ? Math.floor((selectedOpType.max_processing_time - selectedOpType.base_time) / selectedOpType.time_per_unit)
    : null;

  const handleBahanBakuChange = (id) => {
    set('material_id', id);
    set('material_used', null);
    setStockWarning(null);
    const selected = bahanBakuOptions.find(m => m.value === id);
    if (selected?.data && selected.data.current_stock <= selected.data.min_stock_level) {
      setStockWarning(
        `Stok ${selected.data.material_name} hampir habis: ${selected.data.current_stock} ${selected.data.nama_satuan}`
      );
    }
  };

  const validate = () => {
    if (!form.operation_type) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Operation type wajib dipilih' });
      return false;
    }
    if (maxMaterial && form.material_used > maxMaterial) {
      toast.current.show({
        severity: 'warn',
        summary:  'Material terlalu banyak',
        detail:   `Maksimum ${maxMaterial} unit untuk operasi ini (batas waktu ${selectedOpType?.max_processing_time} menit)`,
      });
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
        body: JSON.stringify({
          operation_id:      form.operation_type,
          material_id:       form.material_id    || null,
          material_used:     form.material_used  || null,
          is_urgent:         form.is_urgent,
          machine_id:        null,
          deadline_customer: toLocalDatetimeString(form.deadline_customer),
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.current.show({
          severity: 'success',
          summary:  'Berhasil',
          detail:   `Job ${data.data?.job_id || ''} berhasil ditambahkan`,
        });
        setTimeout(() => routerNav.push('/manajer/job/riwayat'), 1500);
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
    setBahanBakuOptions([]);
    setStockWarning(null);
  };

  const fieldStyle  = { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' };
  const labelStyle  = { fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-color)' };

  return (
    <>
      <Toast ref={toast} />

      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div className="card" style={{ borderRadius: '16px', padding: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.75rem', fontSize: '1.1rem' }}>
            Input Job Baru
          </h3>

          {/* Operation Type */}
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Jenis Operasi <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <Dropdown
              value={form.operation_type}
              options={operationTypes}
              onChange={e => {
                set('operation_type', e.value);
                set('material_id', null);
                set('material_used', null);
                setStockWarning(null);
              }}
              placeholder={operationTypes.length === 0 ? 'Memuat...' : 'Pilih jenis operasi'}
              style={{ width: '100%', borderRadius: '10px' }}
            />
          </div>

          {/* Bahan Baku */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Bahan Baku</label>
            <Dropdown
              value={form.material_id}
              options={bahanBakuOptions}
              onChange={e => handleBahanBakuChange(e.value)}
              placeholder={
                !form.operation_type          ? 'Pilih jenis operasi dulu' :
                loadingBahan                  ? 'Memuat...' :
                bahanBakuOptions.length === 0 ? 'Tidak ada bahan baku tersedia' :
                'Pilih bahan baku'
              }
              disabled={!form.operation_type || loadingBahan}
              filter
              style={{ width: '100%', borderRadius: '10px' }}
            />
            {stockWarning && (
              <small style={{ color: '#f97316' }}>{stockWarning}</small>
            )}
          </div>

          {/* Jumlah Material */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Jumlah Material Digunakan</label>
            <InputNumber
              value={form.material_used}
              onValueChange={e => set('material_used', e.value)}
              min={0}
              max={maxMaterial ?? undefined}
              minFractionDigits={2}
              placeholder="Opsional"
              disabled={!form.material_id}
              style={{ width: '100%' }}
              inputStyle={{ borderRadius: '10px' }}
            />
            {maxMaterial && form.material_id && (
              <small style={{ color: 'var(--text-color-secondary)' }}>
                Maks <strong>{maxMaterial} unit</strong> untuk operasi ini
                (estimasi waktu maks {selectedOpType?.max_processing_time} menit)
              </small>
            )}
          </div>

          {/* Prioritas */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Prioritas Job</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { val: false, label: 'Normal', icon: 'pi-check-circle', activeColor: '#22c55e', activeBg: '#f0fdf4', activeBorder: '#22c55e' },
                { val: true,  label: 'Urgent', icon: 'pi-bolt',         activeColor: '#f59e0b', activeBg: '#fffbeb', activeBorder: '#f59e0b' },
              ].map(opt => {
                const active = form.is_urgent === opt.val;
                return (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => set('is_urgent', opt.val)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '0.5rem', padding: '0.65rem 1rem', borderRadius: '10px',
                      border:     `1.5px solid ${active ? opt.activeBorder : 'var(--surface-border)'}`,
                      background: active ? opt.activeBg : 'var(--surface-ground)',
                      color:      active ? opt.activeColor : 'var(--text-color-secondary)',
                      fontWeight: active ? '600' : '400',
                      fontSize:   '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <i className={`pi ${opt.icon}`} style={{ fontSize: '0.85rem' }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {form.is_urgent && (
              <small style={{ color: '#f59e0b' }}>
                Job urgent mendapat boost prioritas dalam antrian penjadwalan
              </small>
            )}
          </div>

          {/* Deadline Customer */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Deadline Customer</label>
            <Calendar
              value={form.deadline_customer}
              onChange={e => set('deadline_customer', e.value)}
              showTime
              hourFormat="24"
              showIcon
              minDate={new Date()}
              placeholder="Opsional — prediksi otomatis jika kosong"
              style={{ width: '100%' }}
              inputStyle={{ borderRadius: '10px' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
              style={{ borderRadius: '10px' }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default FormInputJob;
