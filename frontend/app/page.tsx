/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface PricingFeature { text: string; included: boolean; }
interface PricingPlan {
  name: string; price: string; period: string; tagline: string;
  color: string; accentColor: string; badge: string | null; features: PricingFeature[];
  pilotPrice: string;
}

/* ── drag state per card ── */
interface DragState {
  dragging: boolean;
  startX: number; startY: number;
  x: number; y: number;
  vx: number; vy: number;
  rotation: number;
}

const INIT_DRAG = (): DragState => ({ dragging: false, startX: 0, startY: 0, x: 0, y: 0, vx: 0, vy: 0, rotation: 0 });

export default function LandingERP() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());
  const [drags, setDrags] = useState<DragState[]>([INIT_DRAG(), INIT_DRAG(), INIT_DRAG()]);
  const [zOrders, setZOrders] = useState([1, 2, 3]);
  const [topZ, setTopZ] = useState(3);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ idx: number; lastX: number; lastY: number; lastTime: number } | null>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  /* ── drag handlers ── */
  const startDrag = useCallback((idx: number, clientX: number, clientY: number) => {
    const newTopZ = topZ + 1;
    setTopZ(newTopZ);
    setZOrders(z => { const n = [...z]; n[idx] = newTopZ; return n; });
    setDrags(d => {
      const n = [...d];
      n[idx] = { ...n[idx], dragging: true, startX: clientX - n[idx].x, startY: clientY - n[idx].y, vx: 0, vy: 0 };
      return n;
    });
    dragRef.current = { idx, lastX: clientX, lastY: clientY, lastTime: Date.now() };
  }, [topZ]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current) return;
    const { idx, lastX, lastY, lastTime } = dragRef.current;
    const now = Date.now();
    const dt = Math.max(now - lastTime, 1);
    const vx = (clientX - lastX) / dt * 16;
    const vy = (clientY - lastY) / dt * 16;
    dragRef.current = { idx, lastX: clientX, lastY: clientY, lastTime: now };
    setDrags(d => {
      const n = [...d];
      const x = clientX - n[idx].startX;
      const y = clientY - n[idx].startY;
      const rot = Math.max(-18, Math.min(18, vx * 1.2));
      n[idx] = { ...n[idx], x, y, vx, vy, rotation: rot };
      return n;
    });
  }, []);

  const endDrag = useCallback((idx: number) => {
    dragRef.current = null;
    setDrags(d => {
      const n = [...d];
      n[idx] = { ...n[idx], dragging: false };
      return n;
    });
    /* spring back with inertia */
    const spring = () => {
      setDrags(d => {
        const n = [...d];
        const c = n[idx];
        if (c.dragging) return n;
        const friction = 0.82;
        const stiffness = 0.12;
        let vx = c.vx * friction - c.x * stiffness;
        let vy = c.vy * friction - c.y * stiffness;
        let x = c.x + vx;
        let y = c.y + vy;
        const rot = c.rotation * 0.78;
        if (Math.abs(x) < 0.3 && Math.abs(y) < 0.3 && Math.abs(vx) < 0.1) {
          x = 0; y = 0; vx = 0; vy = 0;
        }
        n[idx] = { ...c, x, y, vx, vy, rotation: rot };
        return n;
      });
      rafRef.current = requestAnimationFrame(spring);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(spring);
  }, []);

  useEffect(() => {
    const mm = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const mu = (e: MouseEvent) => { if (dragRef.current) endDrag(dragRef.current.idx); };
    const tm = (e: TouchEvent) => { if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY); };
    const tu = (e: TouchEvent) => { if (dragRef.current) endDrag(dragRef.current.idx); };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    window.addEventListener('touchmove', tm, { passive: false });
    window.addEventListener('touchend', tu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', tu);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [moveDrag, endDrag]);

  /* ── DATA ── */
  const features = [
    { title: 'Penjadwalan Otomatis', desc: 'Jadwal produksi dibuat otomatis berbasis Fuzzy Mamdani dan CCEA. Tidak ada lagi penjadwalan manual yang rawan error.', icon: 'pi-calendar' },
    { title: 'Prioritas Job Cerdas', desc: 'Setiap job diberi skor prioritas berdasarkan processing time, konsumsi energi, dan ketersediaan mesin secara real-time.', icon: 'pi-bolt' },
    { title: 'Minimasi Makespan', desc: 'CCEA mengoptimalkan urutan pengerjaan dan alokasi mesin untuk menghasilkan makespan paling minimal.', icon: 'pi-chart-line' },
    { title: 'Notifikasi Stok Otomatis', desc: 'Sistem mendeteksi stok bahan baku kritis dan mengirim notifikasi pengadaan secara otomatis ke Staff Gudang.', icon: 'pi-bell' },
  ];

  const modules = [
    { label: 'Production Scheduling', icon: 'pi-calendar-plus', desc: 'Inti sistem. Mengelola job order, menjalankan pipeline Fuzzy Mamdani dan CCEA, menghasilkan Gantt Chart jadwal produksi.', color: '#4f46e5' },
    { label: 'Inventory', icon: 'pi-box', desc: 'Validator ketersediaan bahan baku setiap kali job order masuk. Stok selalu ter-update real-time.', color: '#0891b2' },
    { label: 'Purchasing', icon: 'pi-shopping-cart', desc: 'Pemicu notifikasi pengadaan otomatis ketika stok bahan baku berada di bawah batas minimum.', color: '#7c3aed' },
  ];

  const roles = [
    { label: 'Administrator', icon: 'pi-shield', desc: 'Mengelola data master, konfigurasi parameter Fuzzy Mamdani dan CCEA, memantau seluruh aktivitas sistem via dashboard.', color: '#4f46e5' },
    { label: 'Manajer Produksi', icon: 'pi-users', desc: 'Menginput job order, memantau pipeline algoritma, memvalidasi jadwal produksi, dan melihat Gantt Chart hasil optimasi.', color: '#0891b2' },
    { label: 'Staff Gudang', icon: 'pi-warehouse', desc: 'Mengelola stok bahan baku, menerima notifikasi kekurangan stok, dan melakukan konfirmasi pengadaan barang.', color: '#7c3aed' },
  ];

  const pricingPlans: PricingPlan[] = [
    {
      name: 'Starter', price: 'Rp 1.500.000', period: '/bulan', pilotPrice: 'Rp 1.050.000',
      tagline: 'Ideal untuk IKM yang baru memulai digitalisasi',
      color: '#0ea5e9', accentColor: '#bae6fd', badge: null,
      features: [
        { text: 'Penjadwalan otomatis dasar', included: true },
        { text: 'Gantt Chart visual', included: true },
        { text: 'Notifikasi stok bahan baku', included: true },
        { text: 'Dashboard lantai produksi', included: true },
        { text: 'Prioritas job Fuzzy Mamdani', included: true },
        { text: 'Prediksi durasi otomatis', included: false },
        { text: 'Optimasi mesin CCEA', included: false },
        { text: 'Multi-lokasi & laporan analitik', included: false },
        { text: 'Akses API & integrasi ERP', included: false },
      ],
    },
    {
      name: 'Growth', price: 'Rp 2.000.000', period: '/bulan', pilotPrice: 'Rp 1.400.000',
      tagline: 'Untuk pabrik yang sedang berkembang pesat',
      color: '#4f46e5', accentColor: '#c7d2fe', badge: 'Paling Populer',
      features: [
        { text: 'Semua fitur Starter', included: true },
        { text: 'Prediksi durasi otomatis', included: true },
        { text: 'Prioritas job Fuzzy Mamdani', included: true },
        { text: 'Optimasi mesin paralel (CCEA)', included: true },
        { text: 'Multi-lokasi produksi', included: true },
        { text: 'Laporan analitik mingguan', included: true },
        { text: 'Dukungan prioritas', included: true },
        { text: 'Akses API & integrasi ERP', included: false },
        { text: 'Dedicated account manager', included: false },
      ],
    },
    {
      name: 'Pro', price: 'Rp 3.500.000', period: '/bulan', pilotPrice: 'Rp 2.450.000',
      tagline: 'Solusi lengkap untuk Industri Menengah ke Atas',
      color: '#7c3aed', accentColor: '#ddd6fe', badge: null,
      features: [
        { text: 'Semua fitur Growth', included: true },
        { text: 'Akses API penuh', included: true },
        { text: 'Laporan analitik kustom', included: true },
        { text: 'SLA uptime terjamin', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Training on-site tim produksi', included: true },
        { text: 'Integrasi ERP eksternal', included: true },
        { text: 'Konfigurasi parameter kustom', included: true },
        { text: 'Onboarding diprioritaskan', included: true },
      ],
    },
  ];

  const faqs = [
    { q: 'Apa itu Fuzzy Mamdani dalam sistem ini?', a: 'Fuzzy Mamdani digunakan untuk menentukan skor prioritas setiap job berdasarkan tiga variabel: processing time, energy consumption, dan machine availability. Hasilnya digunakan sebagai populasi awal CCEA.' },
    { q: 'Apa itu CCEA dan kenapa dipilih?', a: 'Cooperative Co-Evolution Algorithm adalah algoritma evolusioner yang memecah masalah penjadwalan menjadi sub-komponen paralel. Dipilih karena lebih efektif menghindari local optimum dibanding Genetic Algorithm atau PSO.' },
    { q: 'Bagaimana sistem menentukan deadline job?', a: 'Deadline diprediksi otomatis oleh model prediksi yang dilatih dari data historis Actual_End. Operator tidak perlu input deadline secara manual.' },
    { q: 'Apa output akhir dari sistem ini?', a: 'Output utama adalah Gantt Chart jadwal produksi yang menampilkan urutan pengerjaan tiap job per mesin, beserta nilai makespan hasil optimasi CCEA.' },
    { q: 'Siapa saja yang bisa mengakses sistem ini?', a: 'Sistem dapat diakses oleh tiga peran: Administrator, Manajer Produksi, dan Staff Gudang. Masing-masing memiliki hak akses yang berbeda sesuai tanggung jawabnya.' },
  ];

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: '#ffffff', color: '#1e293b', overflowX: 'hidden' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          33%      { transform: translateY(-10px) rotate(1deg); }
          66%      { transform: translateY(-5px) rotate(-1deg); }
        }
        @keyframes float2 {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(30px,-25px) scale(1.08); }
          66%      { transform: translate(-15px,15px) scale(0.95); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(-40px,30px); }
        }
        @keyframes barFill {
          from { width: 0; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pilotPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.35); }
          50%      { box-shadow: 0 0 0 8px rgba(251,191,36,0); }
        }
        @keyframes cardPop {
          from { opacity: 0; transform: translateY(32px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wiggle {
          0%   { transform: rotate(0deg); }
          25%  { transform: rotate(-4deg); }
          75%  { transform: rotate(4deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(79,70,229,0); }
          50%      { box-shadow: 0 0 30px 6px rgba(79,70,229,0.18); }
        }

        .shimmer-btn {
          background: linear-gradient(90deg,#4f46e5 0%,#7c3aed 40%,#4338ca 80%,#4f46e5 100%);
          background-size: 300% auto;
          animation: shimmer 4s linear infinite;
          transition: filter 0.2s, transform 0.2s;
        }
        .shimmer-btn:hover { filter: brightness(1.12); transform: translateY(-2px) !important; }

        .gradient-text {
          background: linear-gradient(135deg,#4f46e5,#7c3aed,#0891b2,#4f46e5);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 6s ease infinite;
        }

        .hero-title  { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .hero-sub    { animation: fadeUp 0.8s 0.18s cubic-bezier(0.16,1,0.3,1) both; }
        .hero-cta    { animation: fadeUp 0.8s 0.32s cubic-bezier(0.16,1,0.3,1) both; }
        .hero-badges { animation: fadeUp 0.8s 0.46s cubic-bezier(0.16,1,0.3,1) both; }
        .hero-visual { animation: scaleIn 1s 0.2s cubic-bezier(0.16,1,0.3,1) both; }

        .float-a { animation: float  5s ease-in-out infinite; }
        .float-b { animation: float2 7s 1.5s ease-in-out infinite; }
        .orb-a   { animation: orb1 12s ease-in-out infinite; }
        .orb-b   { animation: orb2 15s 3s ease-in-out infinite; }

        .ticker-wrap  { overflow: hidden; white-space: nowrap; }
        .ticker-inner { display: inline-flex; animation: ticker 30s linear infinite; }

        .gantt-bar { animation: barFill 1.2s cubic-bezier(0.16,1,0.3,1) both; }

        .scanline-wrap { position: relative; overflow: hidden; }
        .scanline-wrap::after {
          content:''; position:absolute; left:0; right:0; height:2px;
          background:linear-gradient(90deg,transparent,rgba(79,70,229,0.45),transparent);
          animation:scanline 3s linear infinite; pointer-events:none;
        }

        .feat-card {
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s, border-color 0.35s;
        }
        .feat-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 48px rgba(79,70,229,0.13);
          border-color: #4f46e5 !important;
        }
        .mod-card {
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
        }
        .mod-card:hover { transform:translateY(-6px); box-shadow:0 20px 48px rgba(0,0,0,0.1); }

        .role-card {
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
        }
        .role-card:hover { transform:translateY(-6px); box-shadow:0 20px 48px rgba(0,0,0,0.1); }

        /* ── PRICING DRAG CARDS ── */
        .price-card-wrap {
          user-select: none;
          touch-action: none;
        }
        .price-card-wrap:hover .drag-hint { opacity: 1 !important; }

        /* pill badge */
        .pilot-badge { animation: pilotPulse 2.5s ease-in-out infinite; }

        .faq-item { transition: border-color 0.25s, box-shadow 0.25s; }
        .faq-item:hover { border-color: #a5b4fc !important; }

        .stat-item { animation: countUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .stat-item:nth-child(1) { animation-delay:0.1s; }
        .stat-item:nth-child(2) { animation-delay:0.2s; }
        .stat-item:nth-child(3) { animation-delay:0.3s; }

        .mobile-menu { max-height:0; overflow:hidden; transition:max-height 0.35s cubic-bezier(0.16,1,0.3,1); }
        .mobile-menu.open { max-height:480px; }

        /* ── RESPONSIVE NAV ──
           .show-mobile: hamburger, hidden by default, shown only on small screens.
           .hide-mobile: desktop nav links + login button, hidden on small screens. */
        .show-mobile { display: none; }

        @media(max-width:1024px) {
          .hero-grid   { grid-template-columns:1fr !important; }
          .grid-3      { grid-template-columns:repeat(2,1fr) !important; }
          .grid-4      { grid-template-columns:repeat(2,1fr) !important; }
          .pricing-row { flex-direction:column !important; align-items:center !important; }
          .hide-mobile { display:none !important; }
          .show-mobile { display:flex !important; align-items:center; justify-content:center; }
          .navbar-inner { padding:12px 20px !important; }
        }
        @media(max-width:640px) {
          .grid-3,.grid-4 { grid-template-columns:1fr !important; }
          .pricing-row    { padding:0 12px !important; }
          .navbar-inner   { padding:10px 16px !important; }
          .brand-text     { font-size:1.05rem !important; }
        }
      `}</style>

      {/* ══════════════ NAVBAR ══════════════ */}
      <nav className="navbar-inner" style={{
        position:'sticky', top:0, zIndex:50, padding:'14px 32px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.88)',
        backdropFilter:'blur(16px)',
        borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.07)' : 'none',
        transition:'all 0.35s',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          {/* ── LOGO: ganti pi-cog → logo-white.svg ── */}
          <div
            style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(79,70,229,0.4)', transition:'transform 0.2s', cursor:'pointer', flexShrink:0 }}
            onMouseEnter={e=>(e.currentTarget.style.transform='rotate(-8deg) scale(1.08)')}
            onMouseLeave={e=>(e.currentTarget.style.transform='rotate(0) scale(1)')}
          >
            <img
              src="/layout/images/logo-white.svg"
              alt="logo"
              style={{ width:24, height:24, objectFit:'contain' }}
            />
          </div>
          <span className="brand-text" style={{fontWeight:700,fontSize:'1.2rem',color:'#0f172a',letterSpacing:'-0.02em',whiteSpace:'nowrap'}}>
            ERP<span style={{color:'#4f46e5'}}>Jadwal</span>
          </span>
        </div>

        <div className="hide-mobile" style={{display:'flex',alignItems:'center',gap:4}}>
          {['Fitur','Modul','Alur','Harga','FAQ'].map(item=>(
            <a key={item} href={`#${item.toLowerCase()}`} style={{padding:'8px 16px',borderRadius:8,fontWeight:500,color:'#64748b',textDecoration:'none',fontSize:'0.875rem',transition:'color 0.2s,background 0.2s'}}
              onMouseEnter={e=>{(e.target as HTMLElement).style.color='#4f46e5';(e.target as HTMLElement).style.background='#f0f0ff';}}
              onMouseLeave={e=>{(e.target as HTMLElement).style.color='#64748b';(e.target as HTMLElement).style.background='transparent';}}
            >{item}</a>
          ))}
        </div>

        <div className="hide-mobile" style={{display:'flex',gap:8,flexShrink:0}}>
          <button onClick={()=>router.push('/auth/login')}
            style={{padding:'9px 22px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'transparent',fontWeight:600,fontSize:'0.875rem',cursor:'pointer',color:'#374151',fontFamily:"'Poppins',sans-serif",transition:'all 0.2s',whiteSpace:'nowrap'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.color='#4f46e5';e.currentTarget.style.background='#f0f0ff';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#374151';e.currentTarget.style.background='transparent';}}
          >Masuk</button>
        </div>

        {/* Hamburger — hanya tampil di layar ≤1024px */}
        <button
          className="show-mobile"
          aria-label="Buka menu"
          style={{background:'none',border:'none',cursor:'pointer',padding:8,flexShrink:0,width:40,height:40,borderRadius:8}}
          onClick={()=>setMobileMenuOpen(!mobileMenuOpen)}
        >
          <i className={`pi ${mobileMenuOpen?'pi-times':'pi-bars'}`} style={{fontSize:'1.25rem',color:'#374151'}}/>
        </button>
      </nav>

      <div className={`mobile-menu ${mobileMenuOpen?'open':''}`} style={{background:'#fff',borderBottom:'1px solid #e2e8f0',padding:mobileMenuOpen?'12px 24px 20px':'0 24px'}}>
        {['Fitur','Modul','Alur','Harga','FAQ'].map(item=>(
          <a key={item} href={`#${item.toLowerCase()}`} onClick={()=>setMobileMenuOpen(false)}
            style={{display:'block',padding:'12px 0',color:'#374151',textDecoration:'none',fontWeight:500,borderBottom:'1px solid #f1f5f9'}}>{item}</a>
        ))}
        <div style={{display:'flex',gap:8,marginTop:14}}>
          <button
            onClick={()=>{ setMobileMenuOpen(false); router.push('/auth/login'); }}
            style={{flex:1,padding:'12px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#fff',fontWeight:600,fontSize:'0.9rem',cursor:'pointer',color:'#374151',fontFamily:"'Poppins',sans-serif"}}
          >
            Masuk
          </button>
          <button
            onClick={()=>{ setMobileMenuOpen(false); router.push('/auth/login'); }}
            className="shimmer-btn"
            style={{flex:1,padding:12,borderRadius:8,border:'none',color:'#fff',fontWeight:600,fontSize:'0.9rem',cursor:'pointer',fontFamily:"'Poppins',sans-serif"}}
          >
            Daftar
          </button>
        </div>
      </div>

      {/* ══════════════ TICKER ══════════════ */}
      <div style={{background:'linear-gradient(90deg,#4f46e5,#7c3aed)',padding:'8px 0',overflow:'hidden'}}>
        <div className="ticker-wrap">
          <div className="ticker-inner">
            {[...Array(3)].map((_,oi)=>
              ['Fuzzy Mamdani','CCEA Optimizer','Gantt Chart','Prediksi Durasi','Real-time Inventory','Smart Scheduling','Minimasi Makespan','Auto Notifikasi'].map((item,idx)=>(
                <span key={`${oi}-${idx}`} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'0 32px',color:'rgba(255,255,255,0.85)',fontSize:'0.75rem',fontWeight:500}}>
                  <span style={{width:4,height:4,borderRadius:'50%',background:'rgba(255,255,255,0.5)',display:'inline-block'}}/>
                  {item}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{padding:'88px 32px 96px',background:'linear-gradient(135deg,#f8faff 0%,#faf5ff 50%,#f0fafe 100%)',minHeight:'92vh',display:'flex',alignItems:'center',position:'relative',overflow:'hidden'}}>
        <div className="orb-a" style={{position:'absolute',top:-120,right:-80,width:560,height:560,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,70,229,0.12) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div className="orb-b" style={{position:'absolute',bottom:-100,left:-80,width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.09) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(79,70,229,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,0.04) 1px,transparent 1px)',backgroundSize:'48px 48px'}}/>

        <div style={{maxWidth:1200,margin:'0 auto',width:'100%',position:'relative',zIndex:1}}>
          <div className="hero-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:72,alignItems:'center'}}>
            <div>
              <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:28,background:'linear-gradient(135deg,rgba(79,70,229,0.08),rgba(124,58,237,0.08))',border:'1px solid rgba(79,70,229,0.2)',borderRadius:99,padding:'6px 16px 6px 8px',animation:'fadeIn 0.6s ease both'}}>
                <div style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',borderRadius:99,padding:'3px 10px',display:'flex',alignItems:'center',gap:5}}>
                  <i className="pi pi-graduation-cap" style={{color:'#fff',fontSize:'0.65rem'}}/>
                  <span style={{fontSize:'0.7rem',fontWeight:700,color:'#fff'}}>D3 Teknik Informatika</span>
                </div>
                <span style={{fontSize:'0.78rem',fontWeight:600,color:'#4f46e5'}}>Universitas Sebelas Maret</span>
              </div>

              <h1 className="hero-title" style={{fontSize:'clamp(2.2rem,5vw,3.6rem)',fontWeight:800,lineHeight:1.12,letterSpacing:'-0.03em',color:'#0f172a',marginBottom:20}}>
                Penjadwalan Produksi<br/>
                <span className="gradient-text">Lebih Cerdas & Optimal</span>
              </h1>

              <p className="hero-sub" style={{fontSize:'1rem',color:'#475569',lineHeight:1.85,marginBottom:36,maxWidth:490}}>
                Modul penjadwalan produksi pada sistem ERP manufaktur menggunakan <strong style={{color:'#4f46e5'}}>Logika Fuzzy Mamdani</strong> untuk prioritas job dan <strong style={{color:'#7c3aed'}}>CCEA</strong> untuk minimasi makespan.
              </p>

              <div className="hero-cta" style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <button onClick={()=>router.push('/auth/login')} className="shimmer-btn"
                  style={{padding:'14px 30px',borderRadius:12,border:'none',color:'#fff',fontWeight:700,fontSize:'0.95rem',cursor:'pointer',fontFamily:"'Poppins',sans-serif",display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 28px rgba(79,70,229,0.4)'}}>
                  <i className="pi pi-sign-in"/> Masuk ke Sistem
                </button>
                <button onClick={()=>document.getElementById('fitur')?.scrollIntoView({behavior:'smooth'})}
                  style={{padding:'14px 30px',borderRadius:12,border:'2px solid #e2e8f0',background:'#fff',fontWeight:600,fontSize:'0.95rem',cursor:'pointer',color:'#374151',fontFamily:"'Poppins',sans-serif",display:'flex',alignItems:'center',gap:8,transition:'all 0.25s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.color='#4f46e5';e.currentTarget.style.background='#f8f7ff';e.currentTarget.style.transform='translateY(-2px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#374151';e.currentTarget.style.background='#fff';e.currentTarget.style.transform='translateY(0)';}}>
                  <i className="pi pi-info-circle"/> Pelajari Lebih Lanjut
                </button>
              </div>

              <div className="hero-badges" style={{display:'flex',gap:20,marginTop:36,flexWrap:'wrap'}}>
                {[{label:'Fuzzy Mamdani',icon:'pi-sliders-h',color:'#4f46e5'},{label:'CCEA Optimizer',icon:'pi-chart-line',color:'#7c3aed'},{label:'Gantt Chart',icon:'pi-calendar',color:'#0891b2'}].map((b,i)=>(
                  <div key={b.label} style={{display:'flex',alignItems:'center',gap:7,color:'#64748b',fontSize:'0.82rem',animation:`fadeUp 0.6s ${0.5+i*0.1}s both`}}>
                    <div style={{width:26,height:26,borderRadius:6,background:`${b.color}12`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <i className={`pi ${b.icon}`} style={{color:b.color,fontSize:'0.7rem'}}/>
                    </div>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="hero-visual" style={{position:'relative'}}>
              <div className="scanline-wrap" style={{background:'linear-gradient(135deg,#eef2ff,#faf5ff)',borderRadius:24,padding:22,boxShadow:'0 40px 100px rgba(79,70,229,0.18)',border:'1px solid rgba(79,70,229,0.12)'}}>
                <div style={{background:'#fff',borderRadius:16,padding:22}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 0 3px rgba(34,197,94,0.2)'}}/>
                      <span style={{fontWeight:700,fontSize:'0.92rem',color:'#0f172a'}}>Gantt Chart Produksi</span>
                    </div>
                    <span style={{background:'linear-gradient(135deg,#dcfce7,#bbf7d0)',color:'#16a34a',fontSize:'0.7rem',fontWeight:700,padding:'4px 12px',borderRadius:99}}>Live</span>
                  </div>
                  {[
                    {machine:'Mesin A',jobs:[{w:'35%',color:'#4f46e5',label:'JOB-001'},{w:'25%',color:'#7c3aed',label:'JOB-003'}]},
                    {machine:'Mesin B',jobs:[{w:'20%',color:'#0891b2',label:'JOB-002'},{w:'40%',color:'#4f46e5',label:'JOB-005'}]},
                    {machine:'Mesin C',jobs:[{w:'50%',color:'#7c3aed',label:'JOB-004'},{w:'20%',color:'#0891b2',label:'JOB-006'}]},
                  ].map((row,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <span style={{fontSize:'0.7rem',color:'#64748b',fontWeight:600,minWidth:62}}>{row.machine}</span>
                      <div style={{flex:1,height:34,background:'#f1f5f9',borderRadius:8,display:'flex',overflow:'hidden',gap:3,padding:3}}>
                        {row.jobs.map((job,j)=>(
                          <div key={j} className="gantt-bar" style={{width:job.w,height:'100%',background:`linear-gradient(135deg,${job.color},${job.color}cc)`,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',animationDelay:`${0.4+i*0.15+j*0.1}s`,animationDuration:'1s'}}>
                            <span style={{fontSize:'0.58rem',color:'#fff',fontWeight:800,letterSpacing:'0.02em'}}>{job.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:18,padding:'12px 16px',background:'linear-gradient(135deg,#f8faff,#f5f3ff)',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <i className="pi pi-clock" style={{color:'#4f46e5',fontSize:'0.8rem'}}/>
                      <span style={{fontSize:'0.75rem',color:'#64748b',fontWeight:500}}>Makespan Optimal</span>
                    </div>
                    <span style={{fontSize:'0.9rem',fontWeight:800,color:'#4f46e5'}}>160 menit</span>
                  </div>
                </div>
              </div>
              <div className="float-a" style={{position:'absolute',bottom:-20,left:-28,background:'#fff',borderRadius:16,padding:'14px 18px',boxShadow:'0 12px 40px rgba(0,0,0,0.14)',border:'1px solid #e2e8f0',minWidth:160}}>
                <div style={{fontSize:'0.62rem',color:'#94a3b8',fontWeight:700,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Skor Prioritas</div>
                <div style={{fontSize:'1.6rem',fontWeight:800,color:'#0f172a',lineHeight:1}}>87.3</div>
                <div style={{fontSize:'0.68rem',color:'#4f46e5',fontWeight:600,marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                  <i className="pi pi-check-circle" style={{fontSize:'0.68rem'}}/> Fuzzy Mamdani
                </div>
              </div>
              <div className="float-b" style={{position:'absolute',top:-20,right:-20,background:'linear-gradient(135deg,#1e1b4b,#4f46e5)',borderRadius:16,padding:'14px 18px',boxShadow:'0 12px 40px rgba(79,70,229,0.4)',minWidth:140}}>
                <div style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.6)',fontWeight:700,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Stok Kritis</div>
                <div style={{fontSize:'1.6rem',fontWeight:800,color:'#fff',lineHeight:1}}>2 Item</div>
                <div style={{fontSize:'0.68rem',color:'#fde68a',fontWeight:600,marginTop:4}}>⚠ Perlu Restock</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <section style={{background:'#0f172a',padding:'32px 32px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:24}}>
          {[{val:'27',unit:'Rules',label:'Fuzzy IF-THEN',color:'#818cf8'},{val:'3',unit:'Modul',label:'Terintegrasi Penuh',color:'#67e8f9'},{val:'3',unit:'Peran',label:'Akses Sistem',color:'#c4b5fd'}].map((s,i)=>(
            <div key={i} className="stat-item" style={{textAlign:'center'}}>
              <div style={{fontSize:'2.4rem',fontWeight:800,color:s.color,lineHeight:1,letterSpacing:'-0.03em'}}>
                {s.val}<span style={{fontSize:'1rem',fontWeight:600,color:`${s.color}88`,marginLeft:3}}>{s.unit}</span>
              </div>
              <div style={{fontSize:'0.78rem',color:'#64748b',fontWeight:500,marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section id="fitur" style={{padding:'88px 32px',background:'#fff'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{display:'inline-block',background:'#f0f4ff',color:'#4f46e5',borderRadius:8,padding:'4px 14px',fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Fitur Unggulan</div>
            <h2 style={{fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,color:'#0f172a',marginBottom:14,letterSpacing:'-0.02em'}}>Mengapa Sistem Ini Berbeda?</h2>
            <p style={{color:'#64748b',fontSize:'1rem',maxWidth:480,margin:'0 auto',lineHeight:1.75}}>Kombinasi Fuzzy Mamdani dan CCEA menghasilkan jadwal produksi yang adaptif sekaligus optimal.</p>
          </div>
          <div className="grid-4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20}}>
            {features.map((f,i)=>(
              <div key={i} className="feat-card" style={{padding:'30px 24px',borderRadius:18,background:'#fff',border:'1px solid #e2e8f0',animation:`fadeUp 0.7s ${0.1+i*0.1}s both`}}>
                <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(135deg,#eef2ff,#f5f3ff)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                  <i className={`pi ${f.icon}`} style={{color:'#4f46e5',fontSize:'1.25rem'}}/>
                </div>
                <h3 style={{fontWeight:700,fontSize:'0.95rem',marginBottom:10,color:'#0f172a'}}>{f.title}</h3>
                <p style={{color:'#64748b',fontSize:'0.85rem',lineHeight:1.75}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ MODULES ══════════════ */}
      <section id="modul" style={{padding:'88px 32px',background:'#f8faff'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{display:'inline-block',background:'#f0f4ff',color:'#4f46e5',borderRadius:8,padding:'4px 14px',fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Modul Terintegrasi</div>
            <h2 style={{fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,color:'#0f172a',marginBottom:14,letterSpacing:'-0.02em'}}>Tiga Modul, Satu Ekosistem</h2>
            <p style={{color:'#64748b',fontSize:'1rem',maxWidth:480,margin:'0 auto',lineHeight:1.75}}>Production Scheduling sebagai inti, didukung Inventory dan Purchasing yang bekerja selaras.</p>
          </div>
          <div className="grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {modules.map((m,i)=>(
              <div key={i} className="mod-card" style={{padding:'32px 28px',borderRadius:20,background:'#fff',border:'1px solid #e2e8f0',boxShadow:'0 2px 12px rgba(0,0,0,0.04)',animation:`fadeUp 0.7s ${0.1+i*0.12}s both`,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,right:0,width:120,height:120,borderRadius:'50%',background:`radial-gradient(circle,${m.color}10 0%,transparent 70%)`,transform:'translate(30%,-30%)',pointerEvents:'none'}}/>
                <div style={{width:56,height:56,borderRadius:16,background:`${m.color}12`,border:`1px solid ${m.color}25`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                  <i className={`pi ${m.icon}`} style={{color:m.color,fontSize:'1.4rem'}}/>
                </div>
                <h3 style={{fontWeight:700,fontSize:'1rem',marginBottom:10,color:'#0f172a'}}>{m.label}</h3>
                <p style={{color:'#64748b',fontSize:'0.875rem',lineHeight:1.75}}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ ALUR ══════════════ */}
      <section id="alur" style={{padding:'88px 32px',background:'#fff'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{display:'inline-block',background:'#f0f4ff',color:'#4f46e5',borderRadius:8,padding:'4px 14px',fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Alur Sistem</div>
            <h2 style={{fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,color:'#0f172a',marginBottom:14,letterSpacing:'-0.02em'}}>Pipeline Algoritma</h2>
            <p style={{color:'#64748b',fontSize:'1rem',maxWidth:480,margin:'0 auto',lineHeight:1.75}}>Dari input job order hingga Gantt Chart, semua berjalan otomatis dalam satu pipeline terpadu.</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {[
              {step:'01',title:'Input Job Order',desc:'Manajer Produksi menginput Processing Time, Energy Consumption, Machine Availability, dan Operation Type.',icon:'pi-plus-circle',color:'#4f46e5'},
              {step:'02',title:'Validasi Stok',desc:'Sistem otomatis memeriksa ketersediaan bahan baku. Jika kurang, notifikasi dikirim ke Staff Gudang.',icon:'pi-box',color:'#0891b2'},
              {step:'03',title:'Prediksi Deadline',desc:'Model prediksi memprediksi deadline setiap job secara otomatis dari data historis.',icon:'pi-clock',color:'#7c3aed'},
              {step:'04',title:'Fuzzy Mamdani',desc:'Menghitung skor prioritas setiap job berdasarkan 27 rules IF-THEN dengan output nilai 0–100.',icon:'pi-sliders-h',color:'#0891b2'},
              {step:'05',title:'Optimasi CCEA',desc:'Mengoptimalkan urutan pengerjaan dan alokasi mesin untuk menghasilkan makespan minimal.',icon:'pi-chart-line',color:'#4f46e5'},
              {step:'06',title:'Gantt Chart',desc:'Jadwal produksi ditampilkan sebagai Gantt Chart. Manajer memvalidasi sebelum dijadikan jadwal final.',icon:'pi-calendar',color:'#7c3aed'},
            ].map((s,i,arr)=>(
              <div key={i} style={{display:'flex',gap:24,position:'relative',animation:`slideInLeft 0.7s ${0.1+i*0.1}s both`}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{width:50,height:50,borderRadius:'50%',flexShrink:0,background:`${s.color}12`,border:`2px solid ${s.color}`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 0 6px ${s.color}08`,transition:'transform 0.3s'}}
                    onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.12)';}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';}}>
                    <i className={`pi ${s.icon}`} style={{color:s.color,fontSize:'1rem'}}/>
                  </div>
                  {i<arr.length-1&&<div style={{width:2,flex:1,background:'linear-gradient(to bottom,#c7d2fe,#e2e8f0)',margin:'6px 0',minHeight:32}}/>}
                </div>
                <div style={{paddingBottom:i<arr.length-1?30:0,paddingTop:10}}>
                  <div style={{fontSize:'0.68rem',fontWeight:800,color:s.color,marginBottom:5,letterSpacing:'0.1em',textTransform:'uppercase'}}>Langkah {s.step}</div>
                  <h4 style={{fontWeight:700,fontSize:'1rem',color:'#0f172a',marginBottom:7}}>{s.title}</h4>
                  <p style={{color:'#64748b',fontSize:'0.875rem',lineHeight:1.75}}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ ROLES ══════════════ */}
      <section style={{padding:'88px 32px',background:'#f8faff'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{display:'inline-block',background:'#f0f4ff',color:'#4f46e5',borderRadius:8,padding:'4px 14px',fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Pengguna Sistem</div>
            <h2 style={{fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,color:'#0f172a',marginBottom:14,letterSpacing:'-0.02em'}}>Tiga Peran, Satu Tujuan</h2>
          </div>
          <div className="grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {roles.map((r,i)=>(
              <div key={i} className="role-card" style={{padding:'32px 28px',borderRadius:20,background:'#fff',border:'1px solid #e2e8f0',boxShadow:'0 2px 12px rgba(0,0,0,0.04)',animation:`scaleIn 0.7s ${0.1+i*0.12}s both`,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',bottom:-20,right:-20,width:100,height:100,borderRadius:'50%',background:`${r.color}08`,pointerEvents:'none'}}/>
                <div style={{width:56,height:56,borderRadius:16,background:`${r.color}12`,border:`1px solid ${r.color}25`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                  <i className={`pi ${r.icon}`} style={{color:r.color,fontSize:'1.4rem'}}/>
                </div>
                <h3 style={{fontWeight:700,fontSize:'1rem',marginBottom:10,color:'#0f172a'}}>{r.label}</h3>
                <p style={{color:'#64748b',fontSize:'0.875rem',lineHeight:1.75}}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ PRICING — WHITE + DRAGGABLE ══════════════ */}
      <section id="harga" style={{padding:'100px 32px 120px',background:'#ffffff',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(79,70,229,0.055) 1px,transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:-180,right:'10%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,70,229,0.07) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-150,left:'5%',width:420,height:420,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 65%)',pointerEvents:'none'}}/>

        <div style={{maxWidth:1200,margin:'0 auto',position:'relative',zIndex:1}}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{display:'inline-block',background:'#f0f4ff',color:'#4f46e5',borderRadius:8,padding:'4px 14px',fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>Harga Paket</div>
            <h2 style={{fontSize:'clamp(2rem,4.5vw,3rem)',fontWeight:800,color:'#0f172a',marginBottom:16,letterSpacing:'-0.03em',lineHeight:1.15}}>
              Pilih Paket yang{' '}
              <span className="gradient-text">Tepat untuk Anda</span>
            </h2>
            <p style={{color:'#64748b',fontSize:'1rem',maxWidth:500,margin:'0 auto',lineHeight:1.8}}>
              Tiga paket fleksibel sesuai skala kebutuhan pabrik Anda.<br/>
            </p>
          </div>

          <div className="pilot-badge" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,background:'linear-gradient(135deg,#fefce8,#fef9c3)',border:'1.5px solid #fbbf24',borderRadius:14,padding:'12px 24px',maxWidth:'max-content',margin:'28px auto 72px'}}>
            <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#fbbf24,#f59e0b)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 12px rgba(251,191,36,0.4)'}}>
              <i className="pi pi-star-fill" style={{color:'#fff',fontSize:'0.7rem'}}/>
            </div>
            <div>
              <span style={{fontSize:'0.82rem',fontWeight:700,color:'#92400e'}}> Promo Pilot </span>
              <span style={{fontSize:'0.82rem',color:'#78350f'}}>3 pelanggan pertama dapat </span>
              <span style={{fontSize:'0.82rem',fontWeight:800,color:'#b45309'}}>diskon 30% selama 6 bulan pertama</span>
            </div>
          </div>

          <div
            className="pricing-row"
            style={{display:'flex',gap:24,justifyContent:'center',alignItems:'flex-start',minHeight:640,flexWrap:'wrap'}}
          >
            {pricingPlans.map((plan, idx) => {
              const d = drags[idx];
              const isPopular = plan.badge === 'Paling Populer';
              const isDragging = d.dragging;

              const cardStyle: React.CSSProperties = {
                position: 'relative',
                width: 340,
                maxWidth: '100%',
                flexShrink: 0,
                transform: `translate(${d.x}px,${d.y}px) rotate(${d.rotation}deg) ${isDragging ? 'scale(1.04)' : 'scale(1)'}`,
                transition: isDragging ? 'box-shadow 0.2s, filter 0.2s' : 'box-shadow 0.4s, filter 0.2s',
                zIndex: zOrders[idx],
                cursor: isDragging ? 'grabbing' : 'grab',
                borderRadius: 24,
                background: '#ffffff',
                border: isPopular ? `2px solid ${plan.color}` : '1.5px solid #e8ecf4',
                boxShadow: isDragging
                  ? `0 32px 80px rgba(0,0,0,0.22), 0 0 0 3px ${plan.color}30`
                  : isPopular
                  ? `0 20px 60px ${plan.color}22, 0 4px 16px rgba(0,0,0,0.06)`
                  : '0 4px 24px rgba(0,0,0,0.06)',
                filter: isDragging ? 'brightness(1.02)' : 'brightness(1)',
                animation: `cardPop 0.65s ${0.1+idx*0.15}s both`,
                userSelect: 'none',
                willChange: 'transform',
              };

              return (
                <div
                  key={idx}
                  className="price-card-wrap"
                  style={cardStyle}
                  onMouseDown={e => { e.preventDefault(); startDrag(idx, e.clientX, e.clientY); }}
                  onTouchStart={e => { startDrag(idx, e.touches[0].clientX, e.touches[0].clientY); }}
                >
                  {isPopular && (
                    <div style={{position:'absolute',top:-1,left:'50%',transform:'translateX(-50%)',background:`linear-gradient(90deg,${plan.color},#7c3aed)`,color:'#fff',fontSize:'0.65rem',fontWeight:800,padding:'5px 20px',borderRadius:'0 0 12px 12px',letterSpacing:'0.06em',textTransform:'uppercase',boxShadow:`0 4px 16px ${plan.color}50`,whiteSpace:'nowrap'}}>
                      ⭐ Paling Populer
                    </div>
                  )}

                  <div className="drag-hint" style={{position:'absolute',top:14,right:16,opacity:isDragging?0:0.4,transition:'opacity 0.3s',pointerEvents:'none',display:'flex',alignItems:'center',gap:4}}>
                    <i className="pi pi-arrows-alt" style={{fontSize:'0.7rem',color:'#94a3b8'}}/>
                    <span style={{fontSize:'0.6rem',color:'#94a3b8',fontWeight:600}}>drag</span>
                  </div>

                  <div style={{padding:'32px 28px',paddingTop:isPopular?48:32}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${plan.color},${plan.color}88)`,borderRadius:'24px 24px 0 0'}}/>

                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <div style={{width:36,height:36,borderRadius:10,background:`${plan.color}12`,border:`1px solid ${plan.color}30`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <i className={`pi ${idx===0?'pi-star':idx===1?'pi-bolt':'pi-shield'}`} style={{color:plan.color,fontSize:'0.9rem'}}/>
                      </div>
                      <div>
                        <div style={{fontSize:'0.65rem',fontWeight:700,color:plan.color,letterSpacing:'0.1em',textTransform:'uppercase'}}>Paket</div>
                        <h3 style={{fontSize:'1.3rem',fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em',lineHeight:1}}>{plan.name}</h3>
                      </div>
                    </div>

                    <p style={{fontSize:'0.78rem',color:'#94a3b8',lineHeight:1.6,marginBottom:20}}>{plan.tagline}</p>

                    <div style={{marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                        <span style={{fontSize:'1.65rem',fontWeight:800,color:'#0f172a',letterSpacing:'-0.03em',lineHeight:1}}>{plan.price}</span>
                        <span style={{fontSize:'0.78rem',color:'#94a3b8',fontWeight:500}}>{plan.period}</span>
                      </div>
                      <div style={{marginTop:8,display:'inline-flex',alignItems:'center',gap:5,background:'#fefce8',border:'1px solid #fde68a',borderRadius:7,padding:'4px 10px'}}>
                        <i className="pi pi-tag" style={{fontSize:'0.58rem',color:'#f59e0b'}}/>
                        <span style={{fontSize:'0.68rem',fontWeight:700,color:'#b45309'}}>Hemat 30% → {plan.pilotPrice}/bln</span>
                      </div>
                    </div>

                    <div style={{height:1,background:`linear-gradient(90deg,${plan.color}30,#e8ecf4,${plan.color}15)`,margin:'18px 0'}}/>

                    <div style={{display:'flex',flexDirection:'column',gap:9,marginBottom:24}}>
                      {plan.features.map((feat,j)=>(
                        <div key={j} style={{display:'flex',alignItems:'flex-start',gap:9}}>
                          <div style={{width:18,height:18,borderRadius:5,flexShrink:0,marginTop:1,background:feat.included?`${plan.color}15`:'#f8fafc',border:feat.included?`1px solid ${plan.color}35`:'1px solid #e8ecf4',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {feat.included
                              ? <i className="pi pi-check" style={{fontSize:'0.52rem',color:plan.color,fontWeight:900}}/>
                              : <i className="pi pi-minus" style={{fontSize:'0.48rem',color:'#cbd5e1'}}/>
                            }
                          </div>
                          <span style={{fontSize:'0.8rem',lineHeight:1.5,color:feat.included?'#374151':'#cbd5e1',fontWeight:feat.included?500:400}}>{feat.text}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={e=>{ e.stopPropagation(); router.push('/auth/login'); }}
                      onMouseDown={e=>e.stopPropagation()}
                      style={{width:'100%',padding:'13px 20px',borderRadius:12,border:'none',background:`linear-gradient(135deg,${plan.color},${idx===0?'#0284c7':idx===1?'#7c3aed':'#6d28d9'})`,color:'#fff',fontWeight:700,fontSize:'0.875rem',cursor:'pointer',fontFamily:"'Poppins',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 6px 20px ${plan.color}40`,transition:'all 0.25s'}}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 10px 28px ${plan.color}55`;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=`0 6px 20px ${plan.color}40`;}}
                    >
                      <i className="pi pi-arrow-right" style={{fontSize:'0.8rem'}}/> Mulai Sekarang
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{marginTop:64,background:'linear-gradient(135deg,#f8faff,#f5f3ff)',border:'1px solid #e0e7ff',borderRadius:20,padding:'22px 32px',display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:20}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:34,height:34,borderRadius:10,background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="pi pi-info-circle" style={{color:'#4f46e5',fontSize:'0.85rem'}}/>
              </div>
              <span style={{fontSize:'0.875rem',fontWeight:700,color:'#0f172a'}}>Implementation Fee (Onboarding)</span>
            </div>
            <div style={{width:1,height:26,background:'#e2e8f0'}}/>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:'1.05rem',fontWeight:800,color:'#4f46e5'}}>Rp 1.500.000</span>
              <span style={{fontSize:'0.78rem',color:'#64748b'}}>per sesi</span>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
              {['Konfigurasi sistem','Input data awal','Hak akses','Pelatihan platform'].map(item=>(
                <span key={item} style={{fontSize:'0.72rem',background:'#fff',border:'1px solid #e2e8f0',color:'#64748b',padding:'4px 12px',borderRadius:99,fontWeight:500}}>✓ {item}</span>
              ))}
            </div>
            <div style={{width:1,height:26,background:'#e2e8f0'}}/>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <i className="pi pi-clock" style={{color:'#22c55e',fontSize:'0.75rem'}}/>
              <span style={{fontSize:'0.78rem',color:'#16a34a',fontWeight:600}}>Selesai &lt; 1 minggu</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <section id="faq" style={{padding:'88px 32px',background:'#f8faff'}}>
        <div style={{maxWidth:760,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:52}}>
            <div style={{display:'inline-block',background:'#f0f4ff',color:'#4f46e5',borderRadius:8,padding:'4px 14px',fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>FAQ</div>
            <h2 style={{fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em'}}>Pertanyaan Umum</h2>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {faqs.map((faq,i)=>(
              <div key={i} className="faq-item" style={{borderRadius:16,border:`1.5px solid ${openFaq===i?'#4f46e5':'#e2e8f0'}`,overflow:'hidden',boxShadow:openFaq===i?'0 8px 30px rgba(79,70,229,0.1)':'none',transition:'all 0.3s',animation:`fadeUp 0.6s ${0.05+i*0.07}s both`}}>
                <button onClick={()=>setOpenFaq(openFaq===i?null:i)}
                  style={{width:'100%',padding:'20px 22px',background:openFaq===i?'#fafbff':'none',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontWeight:600,fontSize:'0.9rem',color:openFaq===i?'#4f46e5':'#0f172a',textAlign:'left',gap:12,fontFamily:"'Poppins',sans-serif",transition:'background 0.2s,color 0.2s'}}>
                  <span>{faq.q}</span>
                  <div style={{width:28,height:28,borderRadius:'50%',background:openFaq===i?'#4f46e5':'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.3s',transform:openFaq===i?'rotate(45deg)':'rotate(0)'}}>
                    <i className="pi pi-plus" style={{color:openFaq===i?'#fff':'#64748b',fontSize:'0.7rem'}}/>
                  </div>
                </button>
                <div style={{maxHeight:openFaq===i?220:0,overflow:'hidden',transition:'max-height 0.4s cubic-bezier(0.16,1,0.3,1)',padding:openFaq===i?'0 22px 20px':'0 22px'}}>
                  <p style={{color:'#64748b',fontSize:'0.875rem',lineHeight:1.8,borderTop:'1px solid #f1f5f9',paddingTop:14}}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section style={{padding:'48px 32px 88px'}}>
        <div style={{maxWidth:900,margin:'0 auto',background:'linear-gradient(135deg,#1e1b4b 0%,#312e81 30%,#4f46e5 60%,#7c3aed 100%)',backgroundSize:'300% 300%',animation:'gradientShift 8s ease infinite',borderRadius:28,padding:'72px 52px',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 40px 100px rgba(79,70,229,0.35)'}}>
          <div style={{position:'absolute',top:-100,right:-100,width:350,height:350,borderRadius:'50%',background:'rgba(255,255,255,0.04)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:-60,left:-60,width:250,height:250,borderRadius:'50%',background:'rgba(255,255,255,0.03)',pointerEvents:'none'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <h2 style={{fontSize:'clamp(1.8rem,4vw,3rem)',fontWeight:800,color:'#fff',marginBottom:18,letterSpacing:'-0.025em',lineHeight:1.15}}>Siap Optimasi Produksi?</h2>
            <p style={{color:'rgba(199,210,254,0.9)',fontSize:'1rem',marginBottom:36,maxWidth:480,margin:'0 auto 36px',lineHeight:1.8}}>Masuk ke sistem dan mulai kelola jadwal produksi manufaktur Anda secara cerdas dan efisien.</p>
            <button onClick={()=>router.push('/auth/login')}
              style={{padding:'15px 40px',borderRadius:14,border:'none',background:'#fff',color:'#4f46e5',fontWeight:800,fontSize:'1rem',cursor:'pointer',fontFamily:"'Poppins',sans-serif",boxShadow:'0 12px 32px rgba(0,0,0,0.2)',transition:'transform 0.25s,box-shadow 0.25s',display:'inline-flex',alignItems:'center',gap:8}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px) scale(1.02)';e.currentTarget.style.boxShadow='0 20px 48px rgba(0,0,0,0.28)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0) scale(1)';e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,0.2)';}}>
              <i className="pi pi-sign-in"/> Masuk ke Sistem
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer style={{background:'#0f172a',color:'#94a3b8',padding:'44px 32px'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:20,marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {/* ── LOGO FOOTER: ganti pi-cog → logo-white.svg ── */}
              <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#4f46e5,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(79,70,229,0.4)'}}>
                <img
                  src="/layout/images/logo-white.svg"
                  alt="logo"
                  style={{ width:20, height:20, objectFit:'contain' }}
                />
              </div>
              <span style={{fontWeight:700,color:'#fff',fontSize:'1.05rem'}}>ERP<span style={{color:'#818cf8'}}>Jadwal</span></span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              {['Fitur','Modul','Alur','Harga','FAQ'].map(item=>(
                <a key={item} href={`#${item.toLowerCase()}`} style={{color:'#64748b',textDecoration:'none',fontSize:'0.8rem',fontWeight:500,transition:'color 0.2s'}}
                  onMouseEnter={e=>(e.target as HTMLElement).style.color='#818cf8'}
                  onMouseLeave={e=>(e.target as HTMLElement).style.color='#64748b'}
                >{item}</a>
              ))}
            </div>
            <div style={{width:34,height:34,borderRadius:8,background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background 0.2s'}}
              onMouseEnter={e=>(e.currentTarget.style.background='#334155')}
              onMouseLeave={e=>(e.currentTarget.style.background='#1e293b')}>
              <i className="pi pi-github" style={{color:'#94a3b8',fontSize:'0.85rem'}}/>
            </div>
          </div>
          <div style={{borderTop:'1px solid #1e293b',paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <span style={{fontSize:'0.78rem',color:'#475569'}}>© {currentYear} ERPJadwal · D3 Teknik Informatika · Universitas Sebelas Maret</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:'0.72rem',background:'#1e293b',color:'#64748b',padding:'3px 10px',borderRadius:99,fontWeight:500}}>Fuzzy Mamdani + CCEA</span>
              <span style={{fontSize:'0.72rem',background:'#1e293b',color:'#64748b',padding:'3px 10px',borderRadius:99,fontWeight:500}}>Next.js + Express.js</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
