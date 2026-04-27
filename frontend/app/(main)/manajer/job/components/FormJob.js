'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';

const OPERATION_TYPES = ['Grinding', 'Additive', 'Lathe', 'Milling', 'Drilling'];

const defaultForm = {
  machine_id:           null,
  material_id:          null,
  operation_type:       null,
  processing_time:      null,
  energy_consumption:   null,
  machine_availability: null,
  material_used:        null,
  deadline:             null,
};

const FormJob = ({ visible, onHide, onSave, selectedData, machines, materials }) => {
  const [form, setForm]       = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  useEffect(() => {
    if (!visible) return;
    if (selectedData) {
      setForm({
        machine_id:           selectedData.mesin_id || null,
        material_id:          selectedData.material_id || null,
        operation_type:       selectedData.operation_type || null,
        processing_time:      selectedData.processing_time || null,
        energy_consumption:   selectedData.energy_consumption || null,
        machine_availability: selectedData.machine_availability || null,
        material_used:        selectedData.material_used || null,
        deadline:             selectedData.deadline ? new Date(selectedData.deadline) : null,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [visible, selectedData]);

  const validate = () => {
    const e = {};
    if (!form.operation_type)       e.operation_type       = 'Wajib dipilih';
    if (!form.processing_time)      e.processing_time      = 'Wajib diisi';
    if (!form.energy_consumption)   e.energy_consumption   = 'Wajib diisi';
    if (!form.machine_availability) e.machine_availability = 'Wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await onSave({
      ...form,
      deadline: form.deadline ? form.deadline.toISOString() : null,
    });
    setLoading(false);
  };

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  // Auto-fill dari data mesin saat mesin dipilih
  const handleMesinChange = (machineId) => {
    set('machine_id', machineId);
    const mesin = machines.find((m) => m.machine_id === machineId);
    if (mesin) {
      set('machine_availability', mesin.machine_availability ?? null);
      set('energy_consumption',   mesin.energy_rate ?? null);
    }
  };

  const machineOptions = machines.map((m) => ({
    label: `${m.machine_id} - ${m.machine_name} (avail: ${m.machine_availability}%)`,
    value: m.machine_id,
  }));

  const materialOptions = materials.map((m) => ({
    label: `${m.kode_bahan_baku} - ${m.material_name} (stok: ${m.current_stock} ${m.nama_satuan})`,
    value: m.id,
  }));

  const operationOptions = OPERATION_TYPES.map((o) => ({ label: o, value: o }));

  // Ambil info mesin yang sedang dipilih untuk ditampilkan
  const selectedMesin = machines.find((m) => m.machine_id === form.machine_id);

  return (
    <Dialog
      header={selectedData ? `Edit Job: ${selectedData.job_id}` : 'Tambah Job Baru'}
      visible={visible}
      style={{ width: '520px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        {/* Job ID - hanya saat edit */}
        {selectedData && (
          <div className="field mb-4">
            <label className="font-bold block mb-2">Job ID</label>
            <InputText value={selectedData.job_id} disabled className="p-disabled" />
          </div>
        )}

        {/* Operation Type */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Operation Type <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={form.operation_type}
            options={operationOptions}
            onChange={(e) => set('operation_type', e.value)}
            placeholder="-- Pilih Operation Type --"
            className={errors.operation_type ? 'p-invalid' : ''}
          />
          {errors.operation_type && <small className="p-error">{errors.operation_type}</small>}
        </div>

        {/* Mesin */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Mesin</label>
          <Dropdown
            value={form.machine_id}
            options={machineOptions}
            onChange={(e) => handleMesinChange(e.value)}
            placeholder="-- Pilih Mesin (opsional) --"
            filter
          />
          {/* Info mesin yang dipilih */}
          {selectedMesin && (
            <small className="text-color-secondary mt-1 block">
              Kapasitas: {selectedMesin.capacity_per_hour} unit/jam &nbsp;|&nbsp;
              Energy Rate: {selectedMesin.energy_rate} kWh &nbsp;|&nbsp;
              Status: <span className={selectedMesin.status === 'active' ? 'text-green-500' : 'text-red-500'}>
                {selectedMesin.status}
              </span>
            </small>
          )}
        </div>

        {/* Material */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Material</label>
          <Dropdown
            value={form.material_id}
            options={materialOptions}
            onChange={(e) => set('material_id', e.value)}
            placeholder="-- Pilih Material (opsional) --"
            filter
          />
        </div>

        {/* Processing Time + Energy Consumption */}
        <div className="formgrid grid">
          <div className="field col-6">
            <label className="font-bold block mb-2">
              Processing Time (menit) <span className="text-red-500">*</span>
            </label>
            <InputNumber
              value={form.processing_time}
              onValueChange={(e) => set('processing_time', e.value)}
              min={1}
              className={errors.processing_time ? 'p-invalid' : ''}
            />
            {errors.processing_time && <small className="p-error">{errors.processing_time}</small>}
          </div>

          <div className="field col-6">
            <label className="font-bold block mb-2">
              Energy Consumption (kWh) <span className="text-red-500">*</span>
            </label>
            <InputNumber
              value={form.energy_consumption}
              onValueChange={(e) => set('energy_consumption', e.value)}
              min={0}
              minFractionDigits={2}
              className={errors.energy_consumption ? 'p-invalid' : ''}
            />
            {errors.energy_consumption && <small className="p-error">{errors.energy_consumption}</small>}
            {selectedMesin && (
              <small className="text-color-secondary">
                Default dari mesin: {selectedMesin.energy_rate} kWh
              </small>
            )}
          </div>
        </div>

        {/* Machine Availability + Material Used */}
        <div className="formgrid grid">
          <div className="field col-6">
            <label className="font-bold block mb-2">
              Machine Availability (%) <span className="text-red-500">*</span>
            </label>
            <InputNumber
              value={form.machine_availability}
              onValueChange={(e) => set('machine_availability', e.value)}
              min={0}
              max={100}
              suffix="%"
              className={errors.machine_availability ? 'p-invalid' : ''}
            />
            {errors.machine_availability && <small className="p-error">{errors.machine_availability}</small>}
            {selectedMesin && (
              <small className="text-color-secondary">
                Default dari mesin: {selectedMesin.machine_availability}%
              </small>
            )}
          </div>

          <div className="field col-6">
            <label className="font-bold block mb-2">Material Used</label>
            <InputNumber
              value={form.material_used}
              onValueChange={(e) => set('material_used', e.value)}
              min={0}
              minFractionDigits={2}
              placeholder="Opsional"
            />
          </div>
        </div>

        {/* Deadline */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Deadline</label>
          <Calendar
            value={form.deadline}
            onChange={(e) => set('deadline', e.value)}
            showTime
            hourFormat="24"
            placeholder="Pilih deadline (opsional)"
            showIcon
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
            label={selectedData ? 'Simpan Perubahan' : 'Simpan Job'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormJob;