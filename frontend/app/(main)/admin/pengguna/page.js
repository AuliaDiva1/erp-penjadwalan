'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import FormUser from './components/FormUser';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function PenggunaPage() {
  const toast = useRef(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.status === 'success') setUsers(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openTambah = () => {
    setSelectedData(null);
    setDialogVisible(true);
  };

  const openEdit = (user) => {
    setSelectedData(user);
    setDialogVisible(true);
  };

  const handleSave = async (payload) => {
    const url = selectedData
      ? `${BASE_URL}/users/${selectedData.id}`
      : `${BASE_URL}/users`;
    const method = selectedData ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.status === 'success') {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      setDialogVisible(false);
      fetchUsers();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const handleDelete = (id) => {
    confirmDialog({
      message: 'Yakin ingin menghapus user ini?',
      header: 'Konfirmasi Hapus',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        const res = await fetch(`${BASE_URL}/users/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.status === 'success') {
          toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
          fetchUsers();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

  const handleToggle = async (user) => {
    const res = await fetch(`${BASE_URL}/users/${user.id}/toggle-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    const data = await res.json();
    if (data.status === 'success') {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      fetchUsers();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const statusTemplate = (row) => (
    <Tag value={row.is_active ? 'Aktif' : 'Nonaktif'} severity={row.is_active ? 'success' : 'danger'} />
  );

  const roleTemplate = (row) => {
    const map = {
      ADMIN: { label: 'Admin', severity: 'info' },
      MANAJER_PRODUKSI: { label: 'Manajer Produksi', severity: 'warning' },
      STAFF_GUDANG: { label: 'Staff Gudang', severity: 'secondary' },
    };
    const r = map[row.role] || { label: row.role, severity: 'secondary' };
    return <Tag value={r.label} severity={r.severity} />;
  };

  const actionTemplate = (row) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" rounded text severity="info" onClick={() => openEdit(row)} tooltip="Edit" />
      <Button
        icon={row.is_active ? 'pi pi-ban' : 'pi pi-check-circle'}
        rounded text
        severity={row.is_active ? 'warning' : 'success'}
        onClick={() => handleToggle(row)}
        tooltip={row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
      />
      <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleDelete(row.id)} tooltip="Hapus" />
    </div>
  );

  return (
    <div className="card">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Manajemen Pengguna</h2>
          <p className="m-0 text-color-secondary text-sm">Kelola akun pengguna sistem ERP</p>
        </div>
        <Button label="Tambah Pengguna" icon="pi pi-plus" onClick={openTambah} />
      </div>

      <DataTable
        value={users}
        loading={loading}
        paginator
        rows={10}
        stripedRows
        emptyMessage="Belum ada data pengguna"
      >
        <Column field="id" header="ID" style={{ width: '60px' }} />
        <Column field="username" header="Username" />
        <Column field="full_name" header="Nama Lengkap" />
        <Column field="email" header="Email" />
        <Column header="Role" body={roleTemplate} />
        <Column header="Status" body={statusTemplate} />
        <Column header="Aksi" body={actionTemplate} style={{ width: '140px' }} />
      </DataTable>

      <FormUser
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSave={handleSave}
        selectedData={selectedData}
      />
    </div>
  );
}