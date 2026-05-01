'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { ToggleButton } from 'primereact/togglebutton';

const OPERATION_TYPES = ['Grinding', 'Additive', 'Lathe', 'Milling', 'Drilling'];

const defaultForm = {
  machine_id:           null,
  material_id:          null,
  operation_type:       null,
  processing_time:      null,
  energy_consumption:   null,
  machine_availability: null,
  material_used:        null,
  deadline_customer:    null,
  is_urgent:            false,
};

// ✅ FIX: tambahkan default value `= []` untuk machines dan materials
// agar tidak error saat props belum terisi / undefined
const FormJob = ({ visible, onHide, onSave, selectedData, machines = [], materials = [] }) => {
  const [form, setForm]       = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  useEffect(() => {
    if (!visible) return;
    if (selectedData) {
      setForm({
        machine_id:           selectedData.machine_id           || null,
        material_id:          selectedData.material_id          || null,
        operation_type:       selectedData.operation_type       || null,
        processing_time:      selectedData.processing_time      || null,
        energy_consumption:   selectedData.energy_consumption   || null,
        machine_availability: selectedData.machine_availability || null,
        material_used:        selectedData.material_used        || null,
        deadline_customer:    selectedData.deadline_customer
          ? new Date(selectedData.deadline_customer)
          : null,
        is_urgent: selectedData.is_urgent || false,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [visible, selectedData]);

  const validate = () => {
    const e = {};
    if (!form.operation_type)
      e.operation_type = 'Wajib dipilih';
    if (!form.processing_time || form.processing_time < 20 || form.processing_time > 120)
      e.processing_time = 'Harus antara 20-120 menit';
    if (!form.energy_consumption || form.energy_consumption < 2.01 || form.energy_consumption > 14.98)
      e.energy_consumption = 'Harus antara 2.01-14.98 kWh';
    if (!form.machine_availability || form.machine_availability < 80 || form.machine_availability > 99)
      e.machine_availability = 'Harus antara 80-99%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await onSave({
      ...form,
      deadline_customer: form.deadline_customer
        ? form.deadline_customer.toISOString()
        : null,
    });
    setLoading(false);
  };

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const handleMesinChange = (machineId) => {
    set('machine_id', machineId);
    const mesin = machines.find((m) => m.machine_id === machineId);
    if (mesin) {
      set('machine_availability', mesin.machine_availability ?? null);
      set('energy_consumption',   mesin.energy_rate          ?? null);
    }
  };

  // ✅ Aman karena machines sudah default []
  const machineOptions = machines.map((m) => ({
    label: `${m.machine_id} - ${m.machine_name} (${m.machine_availability}%)`,
    value: m.machine_id,
  }));

  // ✅ Aman karena materials sudah default []
  const materialOptions = materials.map((m) => ({
    label: `${m.kode_bahan_baku} - ${m.material_name} (stok: ${m.current_stock} ${m.nama_satuan})`,
    value: m.id,
  }));

  const operationOptions = OPERATION_TYPES.map((o) => ({ label: o, value: o }));
  const selectedMesin    = machines.find((m) => m.machine_id === form.machine_id);

  return (
    <Dialog
      header={selectedData ? `Edit Job: ${selectedData.job_id}` : 'Tambah Job Baru'}
      visible={visible}
      style={{ width: '560px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        {/* JOB ID (hanya tampil saat edit) */}
        {selectedData && (
          <div className="field mb-4">
            <label className="font-bold block mb-2">Job ID</label>
            <InputText value={selectedData.job_id} disabled className="p-disabled" />
          </div>
        )}

        {/* IS URGENT */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Job Mendadak / Urgent?</label>
          <ToggleButton
            checked={form.is_urgent}
            onChange={(e) => set('is_urgent', e.value)}
            onLabel="Ya, Job Ini Urgent"
            offLabel="Tidak Urgent"
            onIcon="pi pi-bolt"
            offIcon="pi pi-check"
            className={form.is_urgent ? 'p-button-danger' : ''}
          />
          {form.is_urgent && (
            <Message
              severity="warn"
              className="mt-2 w-full"
              text="Job urgent akan diprioritaskan dalam antrian pipeline. Sistem akan cek mesin idle terlebih dahulu."
            />
          )}
        </div>

        {/* OPERATION TYPE */}
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
          {errors.operation_type && (
            <small className="p-error">{errors.operation_type}</small>
          )}
        </div>

        {/* MESIN */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Mesin</label>
          <Dropdown
            value={form.machine_id}
            options={machineOptions}
            onChange={(e) => handleMesinChange(e.value)}
            placeholder="-- Pilih Mesin (opsional) --"
            filter
            showClear
          />
          {selectedMesin && (
            <small className="text-color-secondary mt-1 block">
              Kapasitas: {selectedMesin.capacity_per_hour} unit/jam &nbsp;|&nbsp;
              Energy Rate: {selectedMesin.energy_rate} kWh &nbsp;|&nbsp;
              Status:{' '}
              <span className={selectedMesin.status === 'active' ? 'text-green-500' : 'text-red-500'}>
                {selectedMesin.status}
              </span>
            </small>
          )}
        </div>

        {/* MATERIAL */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Material</label>
          <Dropdown
            value={form.material_id}
            options={materialOptions}
            onChange={(e) => set('material_id', e.value)}
            placeholder="-- Pilih Material (opsional) --"
            filter
            showClear
          />
        </div>

        {/* PROCESSING TIME + ENERGY CONSUMPTION */}
        <div className="formgrid grid">
          <div className="field col-6">
            <label className="font-bold block mb-2">
              Processing Time (menit) <span className="text-red-500">*</span>
            </label>
            <InputNumber
              value={form.processing_time}
              onValueChange={(e) => set('processing_time', e.value)}
              min={20}
              max={120}
              className={errors.processing_time ? 'p-invalid' : ''}
            />
            {errors.processing_time && (
              <small className="p-error">{errors.processing_time}</small>
            )}
            <small className="text-color-secondary">Range: 20-120 menit</small>
          </div>

          <div className="field col-6">
            <label className="font-bold block mb-2">
              Energy Consumption (kWh) <span className="text-red-500">*</span>
            </label>
            <InputNumber
              value={form.energy_consumption}
              onValueChange={(e) => set('energy_consumption', e.value)}
              min={2.01}
              max={14.98}
              minFractionDigits={2}
              className={errors.energy_consumption ? 'p-invalid' : ''}
            />
            {errors.energy_consumption && (
              <small className="p-error">{errors.energy_consumption}</small>
            )}
            <small className="text-color-secondary">Range: 2.01-14.98 kWh</small>
          </div>
        </div>

        {/* MACHINE AVAILABILITY + MATERIAL USED */}
        <div className="formgrid grid">
          <div className="field col-6">
            <label className="font-bold block mb-2">
              Machine Availability (%) <span className="text-red-500">*</span>
            </label>
            <InputNumber
              value={form.machine_availability}
              onValueChange={(e) => set('machine_availability', e.value)}
              min={80}
              max={99}
              suffix="%"
              className={errors.machine_availability ? 'p-invalid' : ''}
            />
            {errors.machine_availability && (
              <small className="p-error">{errors.machine_availability}</small>
            )}
            <small className="text-color-secondary">Range: 80-99%</small>
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

        {/* DEADLINE CUSTOMER */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Deadline Customer
            <span className="text-color-secondary font-normal ml-2 text-sm">(opsional)</span>
          </label>
          <Calendar
            value={form.deadline_customer}
            onChange={(e) => set('deadline_customer', e.value)}
            showTime
            hourFormat="24"
            placeholder="Kosongkan jika tidak ada deadline dari customer"
            showIcon
            showButtonBar
            minDate={new Date()}
          />
          <small className="text-color-secondary block mt-1">
            Jika diisi: sistem akan validasi apakah deadline realistis via RF.
            Jika kosong: deadline diprediksi otomatis oleh sistem.
          </small>
        </div>

        {/* ACTION BUTTONS */}
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
            severity={form.is_urgent ? 'danger' : 'primary'}
          />
        </div>

      </div>
    </Dialog>
  );
};

export default FormJob;