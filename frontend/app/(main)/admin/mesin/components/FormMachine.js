'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

const operationTypeOptions = [
  { label: 'Grinding',  value: 'Grinding' },
  { label: 'Additive',  value: 'Additive' },
  { label: 'Lathe',     value: 'Lathe' },
  { label: 'Milling',   value: 'Milling' },
  { label: 'Drilling',  value: 'Drilling' },
];

const statusOptions = [
  { label: 'Active',      value: 'active' },
  { label: 'Inactive',    value: 'inactive' },
  { label: 'Maintenance', value: 'maintenance' },
];

const generateMachineId = (machineList) => {
  if (!machineList || machineList.length === 0) return 'M001';
  const sorted = [...machineList].sort((a, b) => {
    const numA = parseInt(a.machine_id?.replace('M', '') || 0, 10);
    const numB = parseInt(b.machine_id?.replace('M', '') || 0, 10);
    return numB - numA;
  });
  const lastId = sorted[0]?.machine_id || 'M000';
  const numericPart = parseInt(lastId.replace('M', ''), 10);
  const nextNumber = isNaN(numericPart) ? 1 : numericPart + 1;
  return `M${nextNumber.toString().padStart(3, '0')}`;
};

const defaultForm = {
  machine_id: '',
  machine_name: '',
  operation_type: '',
  capacity_per_hour: null,
  energy_rate: null,
  machine_availability: 95,
  status: 'active',
};

const FormMachine = ({ visible, onHide, onSave, selectedData, machineList }) => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!visible) return;
    if (selectedData) {
      setForm({
        machine_id:           selectedData.machine_id || '',
        machine_name:         selectedData.machine_name || '',
        operation_type:       selectedData.operation_type || '',
        capacity_per_hour:    selectedData.capacity_per_hour || null,
        energy_rate:          selectedData.energy_rate || null,
        machine_availability: selectedData.machine_availability ?? 95,
        status:               selectedData.status || 'active',
      });
    } else {
      setForm({ ...defaultForm, machine_id: generateMachineId(machineList) });
    }
    setErrors({});
  }, [visible, selectedData, machineList]);

  const validate = () => {
    const newErrors = {};
    if (!form.machine_name.trim()) newErrors.machine_name = 'Nama mesin wajib diisi';
    if (!form.operation_type)      newErrors.operation_type = 'Operation type wajib dipilih';
    if (!form.capacity_per_hour)   newErrors.capacity_per_hour = 'Kapasitas wajib diisi';
    if (!form.energy_rate)         newErrors.energy_rate = 'Energy rate wajib diisi';
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
      header={selectedData ? `Edit Mesin: ${selectedData.machine_name}` : 'Tambah Mesin Baru'}
      visible={visible}
      style={{ width: '480px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        {/* Machine ID - auto generate, readonly */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Machine ID</label>
          <InputText value={form.machine_id} readOnly disabled className="p-disabled bg-gray-100" />
        </div>

        {/* Nama Mesin */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Nama Mesin <span className="text-red-500">*</span></label>
          <InputText
            value={form.machine_name}
            onChange={(e) => set('machine_name', e.target.value)}
            placeholder="Contoh: CNC Grinding A"
            className={errors.machine_name ? 'p-invalid' : ''}
          />
          {errors.machine_name && <small className="p-error">{errors.machine_name}</small>}
        </div>

        {/* Operation Type */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Operation Type <span className="text-red-500">*</span></label>
          <Dropdown
            value={form.operation_type}
            options={operationTypeOptions}
            onChange={(e) => set('operation_type', e.value)}
            placeholder="-- Pilih Operation Type --"
            className={errors.operation_type ? 'p-invalid' : ''}
          />
          {errors.operation_type && <small className="p-error">{errors.operation_type}</small>}
        </div>

        {/* Kapasitas per Jam */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Kapasitas per Jam <span className="text-red-500">*</span></label>
          <InputNumber
            value={form.capacity_per_hour}
            onValueChange={(e) => set('capacity_per_hour', e.value)}
            placeholder="Contoh: 100"
            min={1}
            className={errors.capacity_per_hour ? 'p-invalid' : ''}
          />
          {errors.capacity_per_hour && <small className="p-error">{errors.capacity_per_hour}</small>}
        </div>

        {/* Energy Rate */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Energy Rate (kWh) <span className="text-red-500">*</span></label>
          <InputNumber
            value={form.energy_rate}
            onValueChange={(e) => set('energy_rate', e.value)}
            placeholder="Contoh: 15.5"
            minFractionDigits={1}
            maxFractionDigits={2}
            min={0}
            className={errors.energy_rate ? 'p-invalid' : ''}
          />
          {errors.energy_rate && <small className="p-error">{errors.energy_rate}</small>}
        </div>

        {/* Machine Availability */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Machine Availability (%)</label>
          <InputNumber
            value={form.machine_availability}
            onValueChange={(e) => set('machine_availability', e.value)}
            min={0}
            max={100}
            suffix="%"
          />
        </div>

        {/* Status - hanya tampil saat edit */}
        {selectedData && (
          <div className="field mb-4">
            <label className="font-bold block mb-2">Status</label>
            <Dropdown
              value={form.status}
              options={statusOptions}
              onChange={(e) => set('status', e.value)}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-content-end gap-2 mt-5">
          <Button
            label="Batal"
            icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
            disabled={loading}
          />
          <Button
            label={selectedData ? 'Simpan Perubahan' : 'Simpan Mesin'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormMachine;