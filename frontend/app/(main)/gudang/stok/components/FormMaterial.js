'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

const defaultForm = {
  material_name:    '',
  operation_type_id: null,
  satuan_id:        null,
  current_stock:    0,
  min_stock_level:  10,
};

const FormMaterial = ({ visible, onHide, onSave, selectedData, satuanList, operationTypeList }) => {
  const [form,    setForm]    = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  useEffect(() => {
    if (!visible) return;
    if (selectedData) {
      setForm({
        material_name:     selectedData.material_name    || '',
        operation_type_id: selectedData.operation_type_id ?? null,
        satuan_id:         selectedData.satuan_id        ?? null,
        current_stock:     selectedData.current_stock    ?? 0,
        min_stock_level:   selectedData.min_stock_level  ?? 10,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [visible, selectedData]);

  const validate = () => {
    const newErrors = {};
    if (!form.material_name.trim()) newErrors.material_name = 'Nama bahan baku wajib diisi';
    if (!form.satuan_id)            newErrors.satuan_id     = 'Satuan wajib dipilih';
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

  const satuanOptions = satuanList.map((s) => ({
    label: `${s.kode_satuan} - ${s.nama_satuan}`,
    value: s.id,
  }));

  const opTypeOptions = [
    { label: '— Tidak Dikaitkan —', value: null },
    ...(operationTypeList ?? [])
      .filter((o) => o.is_active)
      .map((o) => ({
        label: `${o.kode_operasi} - ${o.nama_operasi}`,
        value: o.id,
      })),
  ];

  return (
    <Dialog
      header={selectedData ? `Edit: ${selectedData.material_name}` : 'Tambah Bahan Baku Baru'}
      visible={visible}
      style={{ width: '460px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        {/* Kode — readonly, hanya saat edit */}
        {selectedData && (
          <div className="field mb-4">
            <label className="font-bold block mb-2">Kode Bahan Baku</label>
            <InputText value={selectedData.kode_bahan_baku} disabled className="p-disabled" />
          </div>
        )}

        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Nama Bahan Baku <span className="text-red-500">*</span>
          </label>
          <InputText
            value={form.material_name}
            onChange={(e) => set('material_name', e.target.value)}
            placeholder="Contoh: Aluminium Sheet"
            className={errors.material_name ? 'p-invalid' : ''}
          />
          {errors.material_name && <small className="p-error">{errors.material_name}</small>}
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Operation Type</label>
          <Dropdown
            value={form.operation_type_id}
            options={opTypeOptions}
            onChange={(e) => set('operation_type_id', e.value)}
            placeholder="— Tidak Dikaitkan —"
            filter
          />
          <small className="text-color-secondary">
            Opsional — kaitkan bahan baku dengan jenis operasi tertentu
          </small>
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Satuan <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={form.satuan_id}
            options={satuanOptions}
            onChange={(e) => set('satuan_id', e.value)}
            placeholder="-- Pilih Satuan --"
            className={errors.satuan_id ? 'p-invalid' : ''}
            filter
          />
          {errors.satuan_id && <small className="p-error">{errors.satuan_id}</small>}
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Stok Awal</label>
          <InputNumber
            value={form.current_stock}
            onValueChange={(e) => set('current_stock', e.value)}
            min={0}
            showButtons
          />
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Batas Minimum Stok</label>
          <InputNumber
            value={form.min_stock_level}
            onValueChange={(e) => set('min_stock_level', e.value)}
            min={0}
            showButtons
          />
        </div>

        <div className="flex justify-content-end gap-2 mt-5">
          <Button
            label="Batal"
            icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
            disabled={loading}
          />
          <Button
            label={selectedData ? 'Simpan Perubahan' : 'Simpan Bahan Baku'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormMaterial;