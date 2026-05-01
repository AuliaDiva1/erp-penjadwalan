'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const MODULE_OPTIONS = [
  { label: 'Semua Modul',   value: null           },
  { label: 'Auth',          value: 'AUTH'          },
  { label: 'Users',         value: 'USERS'         },
  { label: 'Materials',     value: 'MATERIALS'     },
  { label: 'Machines',      value: 'MACHINES'      },
  { label: 'Jobs',          value: 'JOBS'          },
  { label: 'Schedules',     value: 'SCHEDULES'     },
  { label: 'Procurements',  value: 'PROCUREMENTS'  },
  { label: 'Pipeline',      value: 'PIPELINE'      },
  { label: 'Konfigurasi',   value: 'KONFIGURASI'   },
];

const ACTION_OPTIONS = [
  { label: 'Semua Aksi', value: null     },
  { label: 'Create',     value: 'CREATE' },
  { label: 'Update',     value: 'UPDATE' },
  { label: 'Delete',     value: 'DELETE' },
  { label: 'Read',       value: 'READ'   },
];

export default function LogAktivitasPage() {
  const toast = useRef(null);
  const [logs, setLogs]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterModule, setFilterModule] = useState(null);
  const [filterAction, setFilterAction] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/activity-logs?limit=200`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat log aktivitas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filteredLogs = logs.filter(l => {
    if (filterModule && l.module !== filterModule) return false;
    if (filterAction && l.action !== filterAction) return false;
    return true;
  });

  const stats = {
    total:   logs.length,
    create:  logs.filter(l => l.action === 'CREATE').length,
    update:  logs.filter(l => l.action === 'UPDATE').length,
    delete:  logs.filter(l => l.action === 'DELETE').length,
  };

  const getActionConfig = (action) => {
    const map = {
      CREATE: { label: 'Create', severity: 'success' },
      UPDATE: { label: 'Update', severity: 'info'    },
      DELETE: { label: 'Delete', severity: 'danger'  },
      READ:   { label: 'Read',   severity: 'secondary'},
    };
    return map[action] || { label: action, severity: 'info' };
  };

  const getRoleConfig = (role) => {
    const map = {
      ADMIN:            { label: 'Admin',    severity: 'danger'  },
      MANAJER_PRODUKSI: { label: 'Manajer',  severity: 'info'    },
      STAFF_GUDANG:     { label: 'Gudang',   severity: 'success' },
    };
    return map[role] || { label: role, severity: 'secondary' };
  };

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }) : '-';

  const actionTemplate = (row) => {
    const s = getActionConfig(row.action);
    return <Tag value={s.label} severity={s.severity} />;
  };

  const roleTemplate = (row) => {
    if (!row.role) return <span className="text-color-secondary">-</span>;
    const s = getRoleConfig(row.role);
    return <Tag value={s.label} severity={s.severity} />;
  };

  const userTemplate = (row) => (
    <div>
      <div className="font-semibold text-sm">{row.full_name || '-'}</div>
      <div className="text-xs text-color-secondary">{row.username || '-'}</div>
    </div>
  );

  const header = (
    <div className="flex justify-content-between align-items-center flex-wrap gap-2">
      <span className="text-sm text-color-secondary">Menampilkan {filteredLogs.length} log</span>
      <div className="flex align-items-center gap-2 flex-wrap">
        <Dropdown
          value={filterModule}
          options={MODULE_OPTIONS}
          onChange={(e) => setFilterModule(e.value)}
          placeholder="Filter Modul"
          style={{ width: '150px' }}
        />
        <Dropdown
          value={filterAction}
          options={ACTION_OPTIONS}
          onChange={(e) => setFilterAction(e.value)}
          placeholder="Filter Aksi"
          style={{ width: '140px' }}
        />
        <Button icon="pi pi-refresh" text onClick={fetchLogs} tooltip="Refresh" loading={loading} />
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari log..."
            style={{ width: '200px' }}
          />
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Log Aktivitas Sistem</h2>
        <p className="m-0 text-color-secondary text-sm">
          Pantau seluruh aktivitas pengguna dalam sistem
        </p>
      </div>

      <div className="grid mb-4">
        {[
          { label: 'Total Log',    value: stats.total,  icon: 'pi-list',         color: '#6366f1', bg: '#eef2ff' },
          { label: 'Create',       value: stats.create, icon: 'pi-plus-circle',  color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Update',       value: stats.update, icon: 'pi-pencil',       color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Delete',       value: stats.delete, icon: 'pi-trash',        color: '#ef4444', bg: '#fef2f2' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-6 lg:col-3">
            <div className="card p-4 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div
                className="flex align-items-center justify-content-center border-round"
                style={{ width: 48, height: 48, background: s.bg }}
              >
                <i className={`pi ${s.icon}`} style={{ fontSize: '1.4rem', color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-color-secondary text-sm">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <DataTable
          value={filteredLogs}
          loading={loading}
          paginator
          rows={20}
          rowsPerPageOptions={[10, 20, 50, 100]}
          stripedRows
          globalFilter={globalFilter}
          header={header}
          emptyMessage="Belum ada log aktivitas"
          sortField="created_at"
          sortOrder={-1}
        >
          <Column field="created_at" header="Waktu"       body={(row) => formatDate(row.created_at)} sortable style={{ minWidth: '160px' }} />
          <Column header="Pengguna"  body={userTemplate}  style={{ minWidth: '140px' }} />
          <Column header="Role"      body={roleTemplate}  style={{ width: '100px' }} />
          <Column field="module"     header="Modul"       sortable style={{ width: '120px' }} />
          <Column field="action"     header="Aksi"        body={actionTemplate} style={{ width: '90px' }} />
          <Column field="description" header="Deskripsi"  style={{ minWidth: '200px' }} />
          <Column field="ip_address" header="IP Address"  body={(row) => row.ip_address || '-'} style={{ width: '130px' }} />
        </DataTable>
      </div>
    </div>
  );
}