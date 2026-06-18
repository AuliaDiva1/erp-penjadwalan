'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast }    from 'primereact/toast';
import { Card }     from 'primereact/card';
import FormJamKerja      from './components/FormJamKerja';
import FormHariKerja     from './components/FormHariKerja';
import FormLemburHari    from './components/FormLemburHari';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function WorkCalendarPage() {
  const toast = useRef(null);
  const [calendar,      setCalendar]      = useState(null);
  const [workDays,      setWorkDays]      = useState([]);
  const [overtimeData,  setOvertimeData]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingOT,     setLoadingOT]     = useState(true);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/work-calendar`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setCalendar(json.data.calendar);
        setWorkDays(json.data.work_days);
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat konfigurasi' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOvertime = async () => {
    setLoadingOT(true);
    try {
      const res  = await fetch(`${BASE_URL}/work-day-overtime`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setOvertimeData(json.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data lembur' });
    } finally {
      setLoadingOT(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    fetchOvertime();
  }, []);

  const onSuccess = (msg) => {
    toast.current.show({ severity: 'success', summary: 'Berhasil', detail: msg });
    fetchCalendar();
    fetchOvertime();
  };

  const onError = (msg) => {
    toast.current.show({ severity: 'error', summary: 'Gagal', detail: msg });
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-900 m-0">Kalender Produksi</h2>
        <p className="text-color-secondary mt-1 mb-0">
          Konfigurasi jam kerja, hari kerja, dan lembur untuk sistem penjadwalan
        </p>
      </div>

      <div className="grid">
        <div className="col-12 md:col-6">
          <Card title="Jam Kerja" className="h-full">
            <FormJamKerja
              data={calendar}
              loading={loading}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Card>
        </div>

        <div className="col-12 md:col-6">
          <Card title="Hari Kerja" className="h-full">
            <FormHariKerja
              data={workDays}
              loading={loading}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Card>
        </div>

        <div className="col-12">
          <Card title="Lembur per Hari">
            <FormLemburHari
              workDays={workDays}
              overtimeData={overtimeData}
              calendar={calendar}
              loading={loadingOT}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}