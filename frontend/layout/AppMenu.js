"use client";
import React, { useContext, useState, useEffect } from "react";
import AppMenuitem from "./AppMenuitem";
import { LayoutContext } from "./context/layoutcontext";
import { MenuProvider } from "./context/menucontext";

const AppMenu = () => {
  const { layoutConfig } = useContext(LayoutContext);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("ROLE");
      setUserRole(role);
    }
  }, []);

  if (!userRole) return null;

  let model = [];

  // =========================
  // 1. ADMIN
  // =========================
  if (userRole === "ADMIN") {
    model = [
      {
        label: "UTAMA",
        items: [
          { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/admin/dashboard" },
        ],
      },
      {
        label: "MASTER DATA",
        items: [
          { label: "Data Pengguna", icon: "pi pi-fw pi-users",  to: "/admin/pengguna"  },
          { label: "Data Mesin",    icon: "pi pi-fw pi-server", to: "/admin/mesin"     },
          { label: "Bahan Baku",    icon: "pi pi-fw pi-box",    to: "/admin/materials" },
          { label: "Satuan",        icon: "pi pi-fw pi-tag",    to: "/admin/satuan"    },
        ],
      },
      {
        label: "KONFIGURASI ALGORITMA",
        items: [
          {
            label: "Fuzzy Mamdani",
            icon: "pi pi-fw pi-sliders-h",
            items: [
              { label: "Parameter & Rules",    icon: "pi pi-fw pi-list",       to: "/admin/konfigurasi/fuzzy/parameter" },
              { label: "Bobot Operation Type", icon: "pi pi-fw pi-percentage", to: "/admin/konfigurasi/fuzzy/bobot"     },
            ],
          },
          { label: "Parameter CCEA",      icon: "pi pi-fw pi-chart-line", to: "/admin/konfigurasi/ccea"  },
          { label: "Model Prediksi (RF)", icon: "pi pi-fw pi-cog",        to: "/admin/konfigurasi/model" },
        ],
      },
      {
        label: "MONITORING",
        items: [
          { label: "Status Jadwal",   icon: "pi pi-fw pi-calendar",           to: "/admin/monitoring/jadwal" },
          { label: "Stok Bahan Baku", icon: "pi pi-fw pi-exclamation-circle", to: "/admin/monitoring/stok"   },
          { label: "Log Aktivitas",   icon: "pi pi-fw pi-list",               to: "/admin/monitoring/log"    },
        ],
      },
      {
        label: "LAPORAN",
        items: [
          { label: "Laporan Produksi", icon: "pi pi-fw pi-file",      to: "/admin/laporan/produksi" },
          { label: "Laporan Stok",     icon: "pi pi-fw pi-file-edit", to: "/admin/laporan/stok"     },
        ],
      },
    ];
  }

  // =========================
  // 2. MANAJER PRODUKSI
  // =========================
  else if (userRole === "MANAJER_PRODUKSI") {
    model = [
      {
        label: "UTAMA",
        items: [
          { label: "Dashboard Produksi", icon: "pi pi-fw pi-home", to: "/manajer/dashboard" },
        ],
      },
      {
        label: "PERENCANAAN & PENJADWALAN",
        items: [
          {
            label: "Job Order",
            icon: "pi pi-fw pi-file-edit",
            items: [
              { label: "Input Job Baru",  icon: "pi pi-fw pi-plus", to: "/manajer/job/tambah" },
              { label: "Riwayat Pesanan", icon: "pi pi-fw pi-list", to: "/manajer/job"        },
            ],
          },
          {
            label: "Penjadwalan",
            icon: "pi pi-fw pi-calendar",
            items: [
              { label: "Jalankan Pipeline", icon: "pi pi-fw pi-play",          to: "/manajer/jadwal/pipeline" },
              { label: "Hasil Algoritma",   icon: "pi pi-fw pi-sliders-h",     to: "/manajer/jadwal/hasil"    },
              { label: "Gantt Chart",       icon: "pi pi-fw pi-chart-bar",     to: "/manajer/jadwal/gantt"    },
              { label: "Jadwal Final",      icon: "pi pi-fw pi-calendar-plus", to: "/manajer/jadwal"          },
            ],
          },
        ],
      },
      {
        label: "MESIN & PERALATAN",
        items: [
          { label: "Data Mesin",   icon: "pi pi-fw pi-server",   to: "/manajer/mesin"        },
          { label: "Jadwal Mesin", icon: "pi pi-fw pi-calendar", to: "/manajer/mesin/jadwal" },
        ],
      },
      {
        label: "LAPORAN",
        items: [
          { label: "Laporan Kinerja",  icon: "pi pi-fw pi-chart-line", to: "/manajer/laporan/kinerja"  },
          { label: "Laporan Makespan", icon: "pi pi-fw pi-chart-bar",  to: "/manajer/laporan/makespan" },
        ],
      },
    ];
  }

  // =========================
  // 3. STAFF GUDANG
  // =========================
  else if (userRole === "STAFF_GUDANG") {
    model = [
      {
        label: "UTAMA",
        items: [
          { label: "Dashboard Gudang", icon: "pi pi-fw pi-home", to: "/gudang/dashboard" },
        ],
      },
      {
        label: "MANAJEMEN STOK",
        items: [
          {
            label: "Bahan Baku",
            icon: "pi pi-fw pi-box",
            items: [
              { label: "Data Stok",   icon: "pi pi-fw pi-list",                 to: "/gudang/stok"        },
              { label: "Update Stok", icon: "pi pi-fw pi-pencil",               to: "/gudang/stok/update" },
              { label: "Stok Kritis", icon: "pi pi-fw pi-exclamation-triangle", to: "/gudang/stok/kritis" },
            ],
          },
        ],
      },
      {
        label: "PENGADAAN",
        items: [
          { label: "Notifikasi Pengadaan", icon: "pi pi-fw pi-bell",         to: "/gudang/pengadaan/notifikasi" },
          { label: "Konfirmasi Pengadaan", icon: "pi pi-fw pi-check-circle", to: "/gudang/pengadaan/konfirmasi" },
          { label: "Riwayat Pengadaan",    icon: "pi pi-fw pi-history",      to: "/gudang/pengadaan/riwayat"    },
        ],
      },
      {
        label: "LAPORAN",
        items: [
          { label: "Laporan Stok",      icon: "pi pi-fw pi-file",      to: "/gudang/laporan/stok"      },
          { label: "Laporan Pengadaan", icon: "pi pi-fw pi-file-edit", to: "/gudang/laporan/pengadaan" },
        ],
      },
    ];
  }

  return (
    <MenuProvider>
      <ul className="layout-menu">
        {model.map((item, i) => (
          <AppMenuitem item={item} root={true} index={i} key={i} />
        ))}
      </ul>
    </MenuProvider>
  );
};

export default AppMenu;