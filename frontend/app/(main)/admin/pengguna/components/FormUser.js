'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

const roleOptions = [
  { label: 'Manajer Produksi', value: 'MANAJER_PRODUKSI' },
  { label: 'Staff Gudang', value: 'STAFF_GUDANG' },
];

const emptyForm = {
  username: '',
  full_name: '',
  email: '',
  password: '',
  role: null,
};

const FormUser = ({ visible, onHide, onSave, selectedData }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible && selectedData) {
      setFormData({
        username: selectedData.username || '',
        full_name: selectedData.full_name || '',
        email: selectedData.email || '',
        password: '',
        role: selectedData.role || null,
      });
    } else {
      setFormData(emptyForm);
    }
    setErrors({});
  }, [visible, selectedData]);

  const validate = () => {
    const err = {};
    if (!formData.username?.trim()) err.username = 'Username wajib diisi';
    if (!formData.full_name?.trim()) err.full_name = 'Nama lengkap wajib diisi';
    if (!formData.email?.trim()) err.email = 'Email wajib diisi';
    if (!selectedData && !formData.password?.trim()) err.password = 'Password wajib diisi';
    if (!formData.role) err.role = 'Role wajib dipilih';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = { ...formData };
    if (selectedData && !payload.password) delete payload.password;
    setLoading(true);
    try {
      await onSave(payload);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      header={selectedData ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
      visible={visible}
      style={{ width: '500px' }}
      modal
      onHide={onHide}
      draggable={false}
    >
      <div className="p-fluid grid mt-2">
        <div className="field col-12 md:col-6">
          <label className="font-bold">Username</label>
          <InputText
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className={errors.username ? 'p-invalid' : ''}
            placeholder="Contoh: manajer01"
          />
          {errors.username && <small className="p-error">{errors.username}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label className="font-bold">Nama Lengkap</label>
          <InputText
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className={errors.full_name ? 'p-invalid' : ''}
            placeholder="Contoh: Budi Santoso"
          />
          {errors.full_name && <small className="p-error">{errors.full_name}</small>}
        </div>

        <div className="field col-12">
          <label className="font-bold">Email</label>
          <InputText
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={errors.email ? 'p-invalid' : ''}
            placeholder="Contoh: budi@gmail.com"
          />
          {errors.email && <small className="p-error">{errors.email}</small>}
        </div>

        <div className="field col-12">
          <label className="font-bold">
            {selectedData ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
          </label>
          <InputText
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={errors.password ? 'p-invalid' : ''}
            placeholder="Minimal 8 karakter"
          />
          {errors.password && <small className="p-error">{errors.password}</small>}
        </div>

        <div className="field col-12">
          <label className="font-bold">Role</label>
          <Dropdown
            value={formData.role}
            options={roleOptions}
            onChange={(e) => setFormData({ ...formData, role: e.value })}
            placeholder="Pilih Role"
            className={errors.role ? 'p-invalid' : ''}
          />
          {errors.role && <small className="p-error">{errors.role}</small>}
        </div>

        <div className="col-12 mt-2 flex justify-content-end gap-2">
          <Button label="Batal" icon="pi pi-times" className="p-button-text" onClick={onHide} />
          <Button label="Simpan" icon="pi pi-save" loading={loading} onClick={handleSubmit} />
        </div>
      </div>
    </Dialog>
  );
};

export default FormUser;