export interface MonitorSuhuPayload {
    id?: number;
    kode_mesin: string;
    tanggal_input: string;
    waktu_input: string;
    keterangan_suhu: number;
}

export interface MonitorSuhu {
    id?: number;
    id_mesin: number;
    tanggal_input: date;
    // kode_mesin?: string;
    // waktu_input: date;
    keterangan_suhu: number;
}
