'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';

const defaultForm = {
  kode_operasi:                 '',
  nama_operasi:                 '',
  deskripsi:                    '',
  energy_rate_default:          null,
  default_machine_availability: null,
  min_processing_time:          20,
  max_processing_time:          120,
  base_time:                    20,
  time_per_unit:                15,
};

const FormOperationType = ({ visible, onHide, onSave, selectedData }) => {
  const [form,    setForm]    = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  useEffect(() => {
    if (!visible) return;
    if (selectedData) {
      setForm({
        kode_operasi:                 selectedData.kode_operasi                 || '',
        nama_operasi:                 selectedData.nama_operasi                 || '',
        deskripsi:                    selectedData.deskripsi                    || '',
        energy_rate_default:          selectedData.energy_rate_default          ?? null,
        default_machine_availability: selectedData.default_machine_availability ?? null,
        min_processing_time:          selectedData.min_processing_time          ?? 20,
        max_processing_time:          selectedData.max_processing_time          ?? 120,
        base_time:                    selectedData.base_time                    ?? 20,
        time_per_unit:                selectedData.time_per_unit                ?? 15,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [visible, selectedData]);

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.kode_operasi.trim()) e.kode_operasi = 'Kode operasi wajib diisi';
    if (!form.nama_operasi.trim()) e.nama_operasi = 'Nama operasi wajib diisi';
    if (form.min_processing_time >= form.max_processing_time)
      e.max_processing_time = 'Max harus lebih besar dari min';
    if (!form.base_time || form.base_time <= 0)
      e.base_time = 'Base time wajib diisi';
    if (!form.time_per_unit || form.time_per_unit <= 0)
      e.time_per_unit = 'Time per unit wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  // Preview processing time untuk material 1, 3, 5 unit
  const preview = form.base_time && form.time_per_unit ? {
    pt1: (form.base_time + 1 * form.time_per_unit).toFixed(1),
    pt3: (form.base_time + 3 * form.time_per_unit).toFixed(1),
    pt5: (form.base_time + 5 * form.time_per_unit).toFixed(1),
  } : null;

  return (
    <Dialog
      header={selectedData ? `Edit: ${selectedData.nama_operasi}` : 'Tambah Operation Type Baru'}
      visible={visible}
      style={{ width: '520px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        {/* Kode Operasi */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Kode Operasi <span className="text-red-500">*</span></label>
          <InputText
            value={form.kode_operasi}
            onChange={e => set('kode_operasi', e.target.value.toUpperCase())}
            placeholder="Contoh: GRD"
            className={errors.kode_operasi ? 'p-invalid' : ''}
            disabled={!!selectedData}
          />
          {errors.kode_operasi && <small className="p-error">{errors.kode_operasi}</small>}
          <small className="text-color-secondary">Kode unik singkat, contoh: GRD, ADD, LAT, MIL, DRL</small>
        </div>

        {/* Nama Operasi */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Nama Operasi <span className="text-red-500">*</span></label>
          <InputText
            value={form.nama_operasi}
            onChange={e => set('nama_operasi', e.target.value)}
            placeholder="Contoh: Grinding"
            className={errors.nama_operasi ? 'p-invalid' : ''}
          />
          {errors.nama_operasi && <small className="p-error">{errors.nama_operasi}</small>}
        </div>

        {/* Deskripsi */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Deskripsi</label>
          <InputTextarea
            value={form.deskripsi}
            onChange={e => set('deskripsi', e.target.value)}
            placeholder="Deskripsi singkat jenis operasi ini"
            rows={3}
            autoResize
          />
        </div>

        {/* Energy Rate & Machine Availability */}
        <div className="formgrid grid">
          <div className="field col-6">
            <label className="font-bold block mb-2">Energy Rate Default (kWh)</label>
            <InputNumber
              value={form.energy_rate_default}
              onValueChange={e => set('energy_rate_default', e.value)}
              min={0}
              minFractionDigits={2}
              placeholder="cth: 8.48"
            />
          </div>
          <div className="field col-6">
            <label className="font-bold block mb-2">Machine Availability Default (%)</label>
            <InputNumber
              value={form.default_machine_availability}
              onValueChange={e => set('default_machine_availability', e.value)}
              min={0}
              max={100}
              minFractionDigits={1}
              placeholder="cth: 89"
              suffix="%"
            />
          </div>
        </div>

        {/* Min & Max Processing Time */}
        <div className="formgrid grid">
          <div className="field col-6">
            <label className="font-bold block mb-2">Min Processing Time</label>
            <InputNumber
              value={form.min_processing_time}
              onValueChange={e => set('min_processing_time', e.value)}
              min={1}
              showButtons
              suffix=" menit"
            />
          </div>
          <div className="field col-6">
            <label className="font-bold block mb-2">Max Processing Time</label>
            <InputNumber
              value={form.max_processing_time}
              onValueChange={e => set('max_processing_time', e.value)}
              min={1}
              showButtons
              suffix=" menit"
              className={errors.max_processing_time ? 'p-invalid' : ''}
            />
            {errors.max_processing_time && <small className="p-error">{errors.max_processing_time}</small>}
          </div>
        </div>

        {/* Base Time & Time Per Unit */}
        <div style={{ background: 'var(--surface-50)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--surface-200)' }}>
          <p style={{ fontWeight: '600', marginTop: 0, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Parameter Kalkulasi Processing Time
          </p>
          <small className="text-color-secondary block mb-3">
            Rumus: <strong>base_time + (material_used × time_per_unit)</strong>
          </small>

          <div className="formgrid grid">
            <div className="field col-6">
              <label className="font-bold block mb-2">Base Time <span className="text-red-500">*</span></label>
              <InputNumber
                value={form.base_time}
                onValueChange={e => set('base_time', e.value)}
                min={1}
                minFractionDigits={1}
                suffix=" menit"
                className={errors.base_time ? 'p-invalid' : ''}
              />
              {errors.base_time && <small className="p-error">{errors.base_time}</small>}
              <small className="text-color-secondary">Waktu setup + minimum pengerjaan</small>
            </div>
            <div className="field col-6">
              <label className="font-bold block mb-2">Time per Unit <span className="text-red-500">*</span></label>
              <InputNumber
                value={form.time_per_unit}
                onValueChange={e => set('time_per_unit', e.value)}
                min={0.1}
                minFractionDigits={1}
                suffix=" menit/unit"
                className={errors.time_per_unit ? 'p-invalid' : ''}
              />
              {errors.time_per_unit && <small className="p-error">{errors.time_per_unit}</small>}
              <small className="text-color-secondary">Tambahan waktu per unit material</small>
            </div>
          </div>

          {preview && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--blue-50)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--blue-700)' }}>
              <i className="pi pi-info-circle mr-2" />
              1 unit → <strong>{preview.pt1} mnt</strong> &nbsp;|&nbsp;
              3 unit → <strong>{preview.pt3} mnt</strong> &nbsp;|&nbsp;
              5 unit → <strong>{preview.pt5} mnt</strong>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-content-end gap-2 mt-4">
          <Button label="Batal" icon="pi pi-times" className="p-button-text" onClick={onHide} disabled={loading} />
          <Button
            label={selectedData ? 'Simpan Perubahan' : 'Simpan Operation Type'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormOperationType;