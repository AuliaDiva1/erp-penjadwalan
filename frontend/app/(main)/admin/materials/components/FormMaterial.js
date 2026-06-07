'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const defaultForm = {
  operation_type_id: null,
  material_name: '',
  satuan_id: null,
  current_stock: 0,
  min_stock_level: 10,
};

const FormMaterial = ({ visible, onHide, onSave, selectedData, satuanList, operationTypes }) => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isManual, setIsManual] = useState(false);
  const [materialOptions, setMaterialOptions] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    if (!visible) return;
    if (selectedData) {
      setForm({
        operation_type_id: selectedData.operation_type_id || null,
        material_name: selectedData.material_name || '',
        satuan_id: selectedData.satuan_id || null,
        current_stock: selectedData.current_stock ?? 0,
        min_stock_level: selectedData.min_stock_level ?? 10,
      });
      setIsManual(true); // saat edit, biarkan manual supaya nama bisa dilihat
    } else {
      setForm(defaultForm);
      setIsManual(false);
      setMaterialOptions([]);
    }
    setErrors({});
  }, [visible, selectedData]);

  // Fetch material options ketika operation_type_id berubah
  useEffect(() => {
    if (!form.operation_type_id || isManual) return;
    const fetch_ = async () => {
      setLoadingMaterials(true);
      try {
        const res = await fetch(`${BASE_URL}/operation-materials?operation_type_id=${form.operation_type_id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          setMaterialOptions(data.data.map((m) => ({ label: m.material_name, value: m.material_name })));
        }
      } catch {}
      setLoadingMaterials(false);
    };
    fetch_();
  }, [form.operation_type_id, isManual]);

  const validate = () => {
    const newErrors = {};
    if (!form.material_name.trim()) newErrors.material_name = 'Nama bahan baku wajib diisi';
    if (!form.satuan_id) newErrors.satuan_id = 'Satuan wajib dipilih';
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

  const handleOperationTypeChange = (value) => {
    set('operation_type_id', value);
    set('material_name', ''); // reset material ketika ganti operation type
  };

  const handleManualToggle = (checked) => {
    setIsManual(checked);
    set('material_name', ''); // reset material ketika toggle
  };

  const operationTypeOptions = operationTypes.map((o) => ({
    label: o.nama_operasi,
    value: o.id,
  }));

  const satuanOptions = satuanList.map((s) => ({
    label: `${s.kode_satuan} - ${s.nama_satuan}`,
    value: s.id,
  }));

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

        {/* Kode - hanya tampil saat edit */}
        {selectedData && (
          <div className="field mb-4">
            <label className="font-bold block mb-2">Kode Bahan Baku</label>
            <InputText value={selectedData.kode_bahan_baku} disabled className="p-disabled bg-gray-100" />
          </div>
        )}

        {/* Operation Type */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Jenis Operasi</label>
          <Dropdown
            value={form.operation_type_id}
            options={operationTypeOptions}
            onChange={(e) => handleOperationTypeChange(e.value)}
            placeholder="-- Pilih Jenis Operasi --"
            filter
            showClear
          />
        </div>

        {/* Toggle Input Manual */}
        <div className="flex align-items-center gap-2 mb-4">
          <Checkbox
            inputId="isManual"
            checked={isManual}
            onChange={(e) => handleManualToggle(e.checked)}
          />
          <label htmlFor="isManual" className="text-sm cursor-pointer">Input nama material secara manual</label>
        </div>

        {/* Nama Material */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Nama Bahan Baku <span className="text-red-500">*</span></label>
          {isManual ? (
            <InputText
              value={form.material_name}
              onChange={(e) => set('material_name', e.target.value)}
              placeholder="Contoh: Aluminium Sheet"
              className={errors.material_name ? 'p-invalid' : ''}
            />
          ) : (
            <Dropdown
              value={form.material_name}
              options={materialOptions}
              onChange={(e) => set('material_name', e.value)}
              placeholder={!form.operation_type_id ? '-- Pilih jenis operasi dulu --' : (loadingMaterials ? 'Memuat...' : '-- Pilih Material --')}
              disabled={!form.operation_type_id || loadingMaterials}
              className={errors.material_name ? 'p-invalid' : ''}
              filter
            />
          )}
          {errors.material_name && <small className="p-error">{errors.material_name}</small>}
        </div>

        {/* Satuan */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Satuan <span className="text-red-500">*</span></label>
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

        {/* Stok Awal - hanya saat tambah */}
        {!selectedData && (
          <div className="field mb-4">
            <label className="font-bold block mb-2">Stok Awal</label>
            <InputNumber
              value={form.current_stock}
              onValueChange={(e) => set('current_stock', e.value)}
              min={0}
              showButtons
            />
          </div>
        )}

        {/* Batas Minimum */}
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
          <Button label="Batal" icon="pi pi-times" className="p-button-text" onClick={onHide} disabled={loading} />
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