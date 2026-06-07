'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';

const defaultForm = {
  kode_operasi: '',
  nama_operasi: '',
  deskripsi: '',
  energy_rate_default: null,
  min_processing_time: 20,
  max_processing_time: 120,
};

const FormOperationType = ({ visible, onHide, onSave, selectedData }) => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!visible) return;
    if (selectedData) {
      setForm({
        kode_operasi:        selectedData.kode_operasi || '',
        nama_operasi:        selectedData.nama_operasi || '',
        deskripsi:           selectedData.deskripsi || '',
        energy_rate_default: selectedData.energy_rate_default ?? null,
        min_processing_time: selectedData.min_processing_time ?? 20,
        max_processing_time: selectedData.max_processing_time ?? 120,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [visible, selectedData]);

  const validate = () => {
    const newErrors = {};
    if (!form.kode_operasi.trim()) newErrors.kode_operasi = 'Kode operasi wajib diisi';
    if (!form.nama_operasi.trim()) newErrors.nama_operasi = 'Nama operasi wajib diisi';
    if (form.min_processing_time >= form.max_processing_time) {
      newErrors.max_processing_time = 'Max processing time harus lebih besar dari min';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  return (
    <Dialog
      header={selectedData ? `Edit: ${selectedData.nama_operasi}` : 'Tambah Operation Type Baru'}
      visible={visible}
      style={{ width: '480px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        {/* Kode - readonly saat edit */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Kode Operasi <span className="text-red-500">*</span></label>
          <InputText
            value={form.kode_operasi}
            onChange={(e) => set('kode_operasi', e.target.value.toUpperCase())}
            placeholder="Contoh: GRD"
            className={errors.kode_operasi ? 'p-invalid' : ''}
            disabled={!!selectedData}
          />
          {errors.kode_operasi && <small className="p-error">{errors.kode_operasi}</small>}
          <small className="text-color-secondary">Kode unik singkat, contoh: GRD, ADD, LAT, MIL, DRL</small>
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Nama Operasi <span className="text-red-500">*</span></label>
          <InputText
            value={form.nama_operasi}
            onChange={(e) => set('nama_operasi', e.target.value)}
            placeholder="Contoh: Grinding"
            className={errors.nama_operasi ? 'p-invalid' : ''}
          />
          {errors.nama_operasi && <small className="p-error">{errors.nama_operasi}</small>}
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Deskripsi</label>
          <InputTextarea
            value={form.deskripsi}
            onChange={(e) => set('deskripsi', e.target.value)}
            placeholder="Deskripsi singkat jenis operasi ini"
            rows={3}
            autoResize
          />
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Energy Rate Default (kWh)</label>
          <InputNumber
            value={form.energy_rate_default}
            onValueChange={(e) => set('energy_rate_default', e.value)}
            min={0}
            minFractionDigits={2}
            placeholder="Konsumsi energi default"
          />
          <small className="text-color-secondary">Opsional — digunakan jika mesin tidak punya energy rate sendiri</small>
        </div>

        <div className="formgrid grid">
          <div className="field col-6">
            <label className="font-bold block mb-2">Min Processing Time (menit)</label>
            <InputNumber
              value={form.min_processing_time}
              onValueChange={(e) => set('min_processing_time', e.value)}
              min={1}
              showButtons
              suffix=" menit"
            />
          </div>
          <div className="field col-6">
            <label className="font-bold block mb-2">Max Processing Time (menit)</label>
            <InputNumber
              value={form.max_processing_time}
              onValueChange={(e) => set('max_processing_time', e.value)}
              min={1}
              showButtons
              suffix=" menit"
              className={errors.max_processing_time ? 'p-invalid' : ''}
            />
            {errors.max_processing_time && <small className="p-error">{errors.max_processing_time}</small>}
          </div>
        </div>

        <div className="flex justify-content-end gap-2 mt-5">
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
