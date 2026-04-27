/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingERP() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach(section => observerRef.current?.observe(section));

    return () => observerRef.current?.disconnect();
  }, []);

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

  const faqs = [
    { q: 'Apa itu Fuzzy Mamdani dalam sistem ini?', a: 'Fuzzy Mamdani digunakan untuk menentukan skor prioritas setiap job berdasarkan tiga variabel: processing time, energy consumption, dan machine availability. Hasilnya digunakan sebagai populasi awal CCEA.' },
    { q: 'Apa itu CCEA dan kenapa dipilih?', a: 'Cooperative Co-Evolution Algorithm adalah algoritma evolusioner yang memecah masalah penjadwalan menjadi sub-komponen paralel. Dipilih karena lebih efektif menghindari local optimum dibanding Genetic Algorithm atau PSO.' },
    { q: 'Bagaimana sistem menentukan deadline job?', a: 'Deadline diprediksi otomatis oleh model Random Forest Regression yang dilatih dari data historis Actual_End. Operator tidak perlu input deadline secara manual.' },
    { q: 'Apa output akhir dari sistem ini?', a: 'Output utama adalah Gantt Chart jadwal produksi yang menampilkan urutan pengerjaan tiap job per mesin, beserta nilai makespan hasil optimasi CCEA.' },
    { q: 'Siapa saja yang bisa mengakses sistem ini?', a: 'Sistem dapat diakses oleh tiga peran: Administrator, Manajer Produksi, dan Staff Gudang. Masing-masing memiliki hak akses yang berbeda sesuai tanggung jawabnya.' },
  ];

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: '#ffffff', color: '#1e293b' }}>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }

        .nav-scrolled {
          box-shadow: 0 2px 20px rgba(0,0,0,0.08) !important;
          background: rgba(255,255,255,0.97) !important;
        }

        /* ---- KEYFRAMES ---- */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-12px) rotate(1deg); }
          66%       { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-16px) rotate(-2deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes orb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.1); }
          66%       { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-50px, 40px) scale(1.15); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(0.9); opacity: 0.8; }
          50%  { transform: scale(1.05); opacity: 0.4; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes borderGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0); }
          50%       { box-shadow: 0 0 0 6px rgba(79,70,229,0.15); }
        }
        @keyframes barFill {
          from { width: 0; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }

        /* ---- HERO ANIMATIONS ---- */
        .hero-title {
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hero-sub {
          animation: fadeUp 0.8s 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-cta {
          animation: fadeUp 0.8s 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-badges {
          animation: fadeUp 0.8s 0.46s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-visual {
          animation: scaleIn 1s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .float-card  { animation: float  5s ease-in-out infinite; }
        .float-card-2 { animation: float2 7s 1.5s ease-in-out infinite; }

        /* ---- SHIMMER BTN ---- */
        .shimmer-btn {
          background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 40%, #4338ca 80%, #4f46e5 100%);
          background-size: 300% auto;
          animation: shimmer 4s linear infinite;
          transition: filter 0.2s, transform 0.2s;
        }
        .shimmer-btn:hover {
          filter: brightness(1.12);
          transform: translateY(-2px);
        }

        /* ---- SECTION REVEAL ---- */
        .reveal-section {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal-section.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ---- CARDS ---- */
        .feature-card {
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s, border-color 0.35s;
        }
        .feature-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 50px rgba(79,70,229,0.15);
          border-color: #4f46e5 !important;
        }
        .feature-card:hover .feature-icon {
          animation: pulseRing 1s ease infinite;
        }

        .module-card {
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
        }
        .module-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.12);
        }

        .role-card {
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
        }
        .role-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.12);
        }

        .faq-item { transition: border-color 0.25s, box-shadow 0.25s; }
        .faq-item:hover { border-color: #a5b4fc !important; }

        /* ---- STAGGER CHILDREN ---- */
        .stagger-children > *:nth-child(1) { transition-delay: 0.05s; }
        .stagger-children > *:nth-child(2) { transition-delay: 0.12s; }
        .stagger-children > *:nth-child(3) { transition-delay: 0.19s; }
        .stagger-children > *:nth-child(4) { transition-delay: 0.26s; }

        /* ---- ORB BG ---- */
        .orb-1 { animation: orb1 12s ease-in-out infinite; }
        .orb-2 { animation: orb2 15s 3s ease-in-out infinite; }

        /* ---- TICKER ---- */
        .ticker-wrap { overflow: hidden; white-space: nowrap; }
        .ticker-inner { display: inline-flex; animation: ticker 30s linear infinite; }

        /* ---- GANTT BAR FILL ---- */
        .gantt-bar {
          animation: barFill 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .gantt-bar:nth-child(1) { animation-delay: 0.3s; }
        .gantt-bar:nth-child(2) { animation-delay: 0.5s; }

        /* ---- SCAN LINE ---- */
        .scanline-wrap { position: relative; overflow: hidden; }
        .scanline-wrap::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(79,70,229,0.5), transparent);
          animation: scanline 3s linear infinite;
          pointer-events: none;
        }

        /* ---- GRADIENT TEXT ANIMATE ---- */
        .gradient-text-animate {
          background: linear-gradient(135deg, #4f46e5, #7c3aed, #0891b2, #4f46e5);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 6s ease infinite;
        }

        /* ---- GRID ---- */
        .grid { display: grid; }
        .grid-2 { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .grid-3 { grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .grid-4 { grid-template-columns: repeat(4, 1fr); gap: 20px; }

        @media (max-width: 1024px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr); }
          .grid-3 { grid-template-columns: repeat(2, 1fr); }
          .hero-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
          .hide-mobile { display: none !important; }
        }

        .mobile-menu { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.16,1,0.3,1); }
        .mobile-menu.open { max-height: 400px; }

        /* ---- STEP CONNECTOR ---- */
        .step-row:not(:last-child)::after {
          content: '';
          display: block;
          width: 2px;
          height: 28px;
          background: linear-gradient(to bottom, #e2e8f0, transparent);
          margin-left: 23px;
        }

        /* ---- GLOW PULSE ON CTA ---- */
        .cta-btn-glow {
          animation: borderGlow 2.5s ease-in-out infinite;
        }

        /* ---- STAT COUNTER ---- */
        .stat-item {
          animation: countUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .stat-item:nth-child(1) { animation-delay: 0.1s; }
        .stat-item:nth-child(2) { animation-delay: 0.2s; }
        .stat-item:nth-child(3) { animation-delay: 0.3s; }
      `}</style>

      {/* ===== NAVBAR ===== */}
      <nav
        className={`nav ${scrolled ? 'nav-scrolled' : ''}`}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          padding: '14px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
          transition: 'all 0.35s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
            transition: 'transform 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(-8deg) scale(1.08)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'rotate(0) scale(1)')}
          >
            <i className="pi pi-cog" style={{ color: '#fff', fontSize: '1.1rem' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            ERP<span style={{ color: '#4f46e5' }}>Jadwal</span>
          </span>
        </div>

        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {['Fitur', 'Modul', 'Alur', 'FAQ'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{
              padding: '8px 16px', borderRadius: 8, fontWeight: 500,
              color: '#64748b', textDecoration: 'none', fontSize: '0.875rem',
              transition: 'color 0.2s, background 0.2s',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#4f46e5'; (e.target as HTMLElement).style.background = '#f0f0ff'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#64748b'; (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              {item}
            </a>
          ))}
        </div>

        <div className="hide-mobile" style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => router.push('/auth/login')}
            style={{
              padding: '9px 22px', borderRadius: 8,
              border: '1.5px solid #e2e8f0', background: 'transparent',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              color: '#374151', fontFamily: "'Poppins', sans-serif",
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#f0f0ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = 'transparent'; }}
          >
            Masuk
          </button>
        </div>

        <button
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          className="show-mobile"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <i className={`pi ${mobileMenuOpen ? 'pi-times' : 'pi-bars'}`} style={{ fontSize: '1.2rem' }} />
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}
        style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: mobileMenuOpen ? '12px 24px 16px' : '0 24px' }}>
        {['Fitur', 'Modul', 'Alur', 'FAQ'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`}
            onClick={() => setMobileMenuOpen(false)}
            style={{ display: 'block', padding: '12px 0', color: '#374151', textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
            {item}
          </a>
        ))}
        <button
          onClick={() => router.push('/auth/login')}
          className="shimmer-btn"
          style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 8, border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
          Masuk ke Sistem
        </button>
      </div>

      {/* ===== TICKER ===== */}
      <div style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', padding: '8px 0', overflow: 'hidden' }}>
        <div className="ticker-wrap">
          <div className="ticker-inner">
            {[...Array(3)].map((_, outerIdx) => (
              ['Fuzzy Mamdani', 'CCEA Optimizer', 'Gantt Chart', 'Random Forest', 'Real-time Inventory', 'Smart Scheduling', 'Minimasi Makespan', 'Auto Notifikasi'].map((item, idx) => (
                <span key={`${outerIdx}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 32px', color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: 500 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'inline-block' }} />
                  {item}
                </span>
              ))
            ))}
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <section style={{
        padding: '88px 32px 96px',
        background: 'linear-gradient(135deg, #f8faff 0%, #faf5ff 50%, #f0fafe 100%)',
        minHeight: '92vh', display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Animated orbs */}
        <div className="orb-1" style={{ position: 'absolute', top: -120, right: -80, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div className="orb-2" style={{ position: 'absolute', bottom: -100, left: -80, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,145,178,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(79,70,229,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>

            {/* Left */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(124,58,237,0.08))',
                border: '1px solid rgba(79,70,229,0.2)', borderRadius: 99, padding: '6px 16px 6px 8px',
                animation: 'fadeIn 0.6s ease both',
              }}>
                <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 99, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="pi pi-graduation-cap" style={{ color: '#fff', fontSize: '0.65rem' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>D3 Teknik Informatika</span>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4f46e5' }}>Universitas Sebelas Maret</span>
              </div>

              <h1 className="hero-title" style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
                fontWeight: 800, lineHeight: 1.12,
                letterSpacing: '-0.03em', color: '#0f172a', marginBottom: 20,
              }}>
                Penjadwalan Produksi<br />
                <span className="gradient-text-animate">
                  Lebih Cerdas & Optimal
                </span>
              </h1>

              <p className="hero-sub" style={{
                fontSize: '1rem', color: '#475569', lineHeight: 1.85,
                marginBottom: 36, maxWidth: 490,
              }}>
                Modul penjadwalan produksi pada sistem ERP manufaktur menggunakan <strong style={{ color: '#4f46e5' }}>Logika Fuzzy Mamdani</strong> untuk prioritas job dan <strong style={{ color: '#7c3aed' }}>CCEA</strong> untuk minimasi makespan.
              </p>

              <div className="hero-cta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="shimmer-btn cta-btn-glow"
                  style={{
                    padding: '14px 30px', borderRadius: 12, border: 'none',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                    cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 8px 28px rgba(79,70,229,0.4)',
                  }}>
                  <i className="pi pi-sign-in" /> Masuk ke Sistem
                </button>
                <button
                  onClick={() => document.getElementById('fitur')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{
                    padding: '14px 30px', borderRadius: 12,
                    border: '2px solid #e2e8f0', background: '#fff',
                    fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                    color: '#374151', fontFamily: "'Poppins', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.25s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#f8f7ff'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <i className="pi pi-info-circle" /> Pelajari Lebih Lanjut
                </button>
              </div>

              <div className="hero-badges" style={{ display: 'flex', gap: 20, marginTop: 36, flexWrap: 'wrap' }}>
                {[
                  { label: 'Fuzzy Mamdani', icon: 'pi-sliders-h', color: '#4f46e5' },
                  { label: 'CCEA Optimizer', icon: 'pi-chart-line', color: '#7c3aed' },
                  { label: 'Gantt Chart', icon: 'pi-calendar', color: '#0891b2' },
                ].map((b, i) => (
                  <div key={b.label} style={{
                    display: 'flex', alignItems: 'center', gap: 7, color: '#64748b', fontSize: '0.82rem',
                    animation: `fadeUp 0.6s ${0.5 + i * 0.1}s both`,
                  }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: `${b.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`pi ${b.icon}`} style={{ color: b.color, fontSize: '0.7rem' }} />
                    </div>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Visual */}
            <div className="hero-visual" style={{ position: 'relative' }}>
              <div className="scanline-wrap" style={{
                background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
                borderRadius: 24, padding: 22,
                boxShadow: '0 40px 100px rgba(79,70,229,0.18)',
                border: '1px solid rgba(79,70,229,0.12)',
              }}>
                {/* Mock Gantt Chart */}
                <div style={{ background: '#fff', borderRadius: 16, padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>Gantt Chart Produksi</span>
                    </div>
                    <span style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#16a34a', fontSize: '0.7rem', fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>Live</span>
                  </div>
                  {[
                    { machine: 'Mesin A', jobs: [{ w: '35%', color: '#4f46e5', label: 'JOB-001' }, { w: '25%', color: '#7c3aed', label: 'JOB-003' }] },
                    { machine: 'Mesin B', jobs: [{ w: '20%', color: '#0891b2', label: 'JOB-002' }, { w: '40%', color: '#4f46e5', label: 'JOB-005' }] },
                    { machine: 'Mesin C', jobs: [{ w: '50%', color: '#7c3aed', label: 'JOB-004' }, { w: '20%', color: '#0891b2', label: 'JOB-006' }] },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, minWidth: 62 }}>{row.machine}</span>
                      <div style={{ flex: 1, height: 34, background: '#f1f5f9', borderRadius: 8, display: 'flex', overflow: 'hidden', gap: 3, padding: 3 }}>
                        {row.jobs.map((job, j) => (
                          <div key={j} className="gantt-bar" style={{
                            width: job.w, height: '100%',
                            background: `linear-gradient(135deg, ${job.color}, ${job.color}cc)`,
                            borderRadius: 6, display: 'flex', alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25)`,
                            animationDelay: `${0.4 + i * 0.15 + j * 0.1}s`,
                            animationDuration: '1s',
                          }}>
                            <span style={{ fontSize: '0.58rem', color: '#fff', fontWeight: 800, letterSpacing: '0.02em' }}>{job.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 18, padding: '12px 16px', background: 'linear-gradient(135deg, #f8faff, #f5f3ff)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="pi pi-clock" style={{ color: '#4f46e5', fontSize: '0.8rem' }} />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Makespan Optimal</span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4f46e5' }}>160 menit</span>
                  </div>
                </div>
              </div>

              {/* Float cards */}
              <div className="float-card" style={{
                position: 'absolute', bottom: -20, left: -28,
                background: '#fff', borderRadius: 16, padding: '14px 18px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.14)', border: '1px solid #e2e8f0', minWidth: 160,
              }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skor Prioritas</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>87.3</div>
                <div style={{ fontSize: '0.68rem', color: '#4f46e5', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="pi pi-check-circle" style={{ fontSize: '0.68rem' }} />
                  Fuzzy Mamdani
                </div>
              </div>

              <div className="float-card-2" style={{
                position: 'absolute', top: -20, right: -20,
                background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)',
                borderRadius: 16, padding: '14px 18px',
                boxShadow: '0 12px 40px rgba(79,70,229,0.4)', minWidth: 140,
              }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stok Kritis</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>2 Item</div>
                <div style={{ fontSize: '0.68rem', color: '#fde68a', fontWeight: 600, marginTop: 4 }}>⚠ Perlu Restock</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section style={{ background: '#0f172a', padding: '32px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
          {[
            { val: '27', unit: 'Rules', label: 'Fuzzy IF-THEN', color: '#818cf8' },
            { val: '3', unit: 'Modul', label: 'Terintegrasi Penuh', color: '#67e8f9' },
            { val: '3', unit: 'Peran', label: 'Akses Sistem', color: '#c4b5fd' },
          ].map((s, i) => (
            <div key={i} className="stat-item" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {s.val}<span style={{ fontSize: '1rem', fontWeight: 600, color: `${s.color}88`, marginLeft: 3 }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="fitur" style={{ padding: '88px 32px', background: '#fff' }}
        data-animate="fitur"
        ref={el => { if (el) { el.id = 'fitur-section'; observerRef.current?.observe(el); } }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-block', background: '#f0f4ff', color: '#4f46e5', borderRadius: 8, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Fitur Unggulan
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#0f172a', marginBottom: 14, letterSpacing: '-0.02em' }}>
              Mengapa Sistem Ini Berbeda?
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
              Kombinasi Fuzzy Mamdani dan CCEA menghasilkan jadwal produksi yang adaptif sekaligus optimal.
            </p>
          </div>
          <div className="grid grid-4 stagger-children">
            {features.map((f, i) => (
              <div key={i} className="feature-card" style={{
                padding: '30px 24px', borderRadius: 18, background: '#fff',
                border: '1px solid #e2e8f0',
                animation: `fadeUp 0.7s ${0.1 + i * 0.1}s both`,
              }}>
                <div className="feature-icon" style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                  transition: 'transform 0.3s',
                }}>
                  <i className={`pi ${f.icon}`} style={{ color: '#4f46e5', fontSize: '1.25rem' }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, color: '#0f172a' }}>{f.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.75 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MODULES ===== */}
      <section id="modul" style={{ padding: '88px 32px', background: '#f8faff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-block', background: '#f0f4ff', color: '#4f46e5', borderRadius: 8, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Modul Terintegrasi
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#0f172a', marginBottom: 14, letterSpacing: '-0.02em' }}>
              Tiga Modul, Satu Ekosistem
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
              Production Scheduling sebagai inti, didukung Inventory dan Purchasing yang bekerja selaras.
            </p>
          </div>
          <div className="grid grid-3">
            {modules.map((m, i) => (
              <div key={i} className="module-card" style={{
                padding: '32px 28px', borderRadius: 20, background: '#fff',
                border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                animation: `fadeUp 0.7s ${0.1 + i * 0.12}s both`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 120, height: 120, borderRadius: '50%',
                  background: `radial-gradient(circle, ${m.color}10 0%, transparent 70%)`,
                  transform: 'translate(30%, -30%)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: `${m.color}12`,
                  border: `1px solid ${m.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <i className={`pi ${m.icon}`} style={{ color: m.color, fontSize: '1.4rem' }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 10, color: '#0f172a' }}>{m.label}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.75 }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ALUR SISTEM ===== */}
      <section id="alur" style={{ padding: '88px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-block', background: '#f0f4ff', color: '#4f46e5', borderRadius: 8, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Alur Sistem
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#0f172a', marginBottom: 14, letterSpacing: '-0.02em' }}>
              Pipeline Algoritma
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
              Dari input job order hingga Gantt Chart, semua berjalan otomatis dalam satu pipeline terpadu.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { step: '01', title: 'Input Job Order', desc: 'Manajer Produksi menginput Processing Time, Energy Consumption, Machine Availability, dan Operation Type.', icon: 'pi-plus-circle', color: '#4f46e5' },
              { step: '02', title: 'Validasi Stok', desc: 'Sistem otomatis memeriksa ketersediaan bahan baku. Jika kurang, notifikasi dikirim ke Staff Gudang.', icon: 'pi-box', color: '#0891b2' },
              { step: '03', title: 'Prediksi Deadline', desc: 'Model Random Forest Regression memprediksi deadline setiap job secara otomatis dari data historis.', icon: 'pi-clock', color: '#7c3aed' },
              { step: '04', title: 'Fuzzy Mamdani', desc: 'Menghitung skor prioritas setiap job berdasarkan 27 rules IF-THEN dengan output nilai 0–100.', icon: 'pi-sliders-h', color: '#0891b2' },
              { step: '05', title: 'Optimasi CCEA', desc: 'Mengoptimalkan urutan pengerjaan dan alokasi mesin untuk menghasilkan makespan minimal.', icon: 'pi-chart-line', color: '#4f46e5' },
              { step: '06', title: 'Gantt Chart', desc: 'Jadwal produksi ditampilkan sebagai Gantt Chart. Manajer memvalidasi sebelum dijadikan jadwal final.', icon: 'pi-calendar', color: '#7c3aed' },
            ].map((s, i, arr) => (
              <div key={i} style={{
                display: 'flex', gap: 24, position: 'relative',
                animation: `slideInLeft 0.7s ${0.1 + i * 0.1}s both`,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                    background: `${s.color}12`,
                    border: `2px solid ${s.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 0 6px ${s.color}08`,
                    transition: 'transform 0.3s, box-shadow 0.3s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = `0 0 0 10px ${s.color}14`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 0 6px ${s.color}08`; }}
                  >
                    <i className={`pi ${s.icon}`} style={{ color: s.color, fontSize: '1rem' }} />
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: 'linear-gradient(to bottom, #c7d2fe, #e2e8f0)', margin: '6px 0', minHeight: 32 }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 30 : 0, paddingTop: 10 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: s.color, marginBottom: 5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Langkah {s.step}</div>
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 7 }}>{s.title}</h4>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.75 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ROLES ===== */}
      <section style={{ padding: '88px 32px', background: '#f8faff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-block', background: '#f0f4ff', color: '#4f46e5', borderRadius: 8, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Pengguna Sistem
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#0f172a', marginBottom: 14, letterSpacing: '-0.02em' }}>
              Tiga Peran, Satu Tujuan
            </h2>
          </div>
          <div className="grid grid-3">
            {roles.map((r, i) => (
              <div key={i} className="role-card" style={{
                padding: '32px 28px', borderRadius: 20, background: '#fff',
                border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                animation: `scaleIn 0.7s ${0.1 + i * 0.12}s both`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', bottom: -20, right: -20,
                  width: 100, height: 100, borderRadius: '50%',
                  background: `${r.color}08`,
                  pointerEvents: 'none',
                }} />
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: `${r.color}12`,
                  border: `1px solid ${r.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <i className={`pi ${r.icon}`} style={{ color: r.color, fontSize: '1.4rem' }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 10, color: '#0f172a' }}>{r.label}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.75 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" style={{ padding: '88px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: '#f0f4ff', color: '#4f46e5', borderRadius: 8, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              FAQ
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Pertanyaan Umum
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item" style={{
                borderRadius: 16,
                border: `1.5px solid ${openFaq === i ? '#4f46e5' : '#e2e8f0'}`,
                overflow: 'hidden',
                boxShadow: openFaq === i ? '0 8px 30px rgba(79,70,229,0.1)' : 'none',
                transition: 'all 0.3s',
                animation: `fadeUp 0.6s ${0.05 + i * 0.07}s both`,
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', padding: '20px 22px', background: openFaq === i ? '#fafbff' : 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', fontWeight: 600, fontSize: '0.9rem',
                    color: openFaq === i ? '#4f46e5' : '#0f172a', textAlign: 'left', gap: 12,
                    fontFamily: "'Poppins', sans-serif", transition: 'background 0.2s, color 0.2s',
                  }}>
                  <span>{faq.q}</span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: openFaq === i ? '#4f46e5' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.3s',
                    transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)',
                  }}>
                    <i className="pi pi-plus" style={{ color: openFaq === i ? '#fff' : '#64748b', fontSize: '0.7rem' }} />
                  </div>
                </button>
                <div style={{
                  maxHeight: openFaq === i ? 220 : 0,
                  overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.16,1,0.3,1)',
                  padding: openFaq === i ? '0 22px 20px' : '0 22px',
                }}>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ padding: '48px 32px 88px' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4f46e5 60%, #7c3aed 100%)',
          backgroundSize: '300% 300%',
          animation: 'gradientShift 8s ease infinite',
          borderRadius: 28, padding: '72px 52px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(79,70,229,0.35)',
        }}>
          <div style={{ position: 'absolute', top: -100, right: -100, width: 350, height: 350, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

          {/* Grid overlay on CTA */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', marginBottom: 18, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              Siap Optimasi Produksi?
            </h2>
            <p style={{ color: 'rgba(199,210,254,0.9)', fontSize: '1rem', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.8 }}>
              Masuk ke sistem dan mulai kelola jadwal produksi manufaktur Anda secara cerdas dan efisien.
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              style={{
                padding: '15px 40px', borderRadius: 14, border: 'none',
                background: '#fff', color: '#4f46e5', fontWeight: 800, fontSize: '1rem',
                cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
                boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                transition: 'transform 0.25s, box-shadow 0.25s',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 20px 48px rgba(0,0,0,0.28)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)'; }}
            >
              <i className="pi pi-sign-in" />
              Masuk ke Sistem
            </button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '44px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
              }}>
                <i className="pi pi-cog" style={{ color: '#fff', fontSize: '0.9rem' }} />
              </div>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem' }}>
                ERP<span style={{ color: '#818cf8' }}>Jadwal</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {['Fitur', 'Modul', 'Alur', 'FAQ'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500, transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = '#818cf8'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = '#64748b'}
                >
                  {item}
                </a>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: 'pi-github', label: 'GitHub' },
              ].map(s => (
                <div key={s.icon} style={{
                  width: 34, height: 34, borderRadius: 8, background: '#1e293b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#1e293b'}
                >
                  <i className={`pi ${s.icon}`} style={{ color: '#94a3b8', fontSize: '0.85rem' }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: '0.78rem', color: '#475569' }}>
              © {currentYear} ERPJadwal · D3 Teknik Informatika · Universitas Sebelas Maret
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#64748b', padding: '3px 10px', borderRadius: 99, fontWeight: 500 }}>
                Fuzzy Mamdani + CCEA
              </span>
              <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#64748b', padding: '3px 10px', borderRadius: 99, fontWeight: 500 }}>
                Next.js + Express.js
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
