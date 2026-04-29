'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ToastNotifier from '../../../components/ToastNotifier';
import axios from 'axios';
import { roleRoutes } from '../../../../utils/roleRoutes';

type ToastHandle = { showToast: (status: string, message?: string) => void };

const LOGIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes chipIn {
    from { opacity: 0; transform: scale(0.7) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes orbFloat {
    0%   { transform: translateY(0px) scale(1); opacity: 0.35; }
    50%  { transform: translateY(-22px) scale(1.07); opacity: 0.6; }
    100% { transform: translateY(0px) scale(1); opacity: 0.35; }
  }
  @keyframes orbFloatReverse {
    0%   { transform: translateY(0px) scale(1); opacity: 0.25; }
    50%  { transform: translateY(18px) scale(1.05); opacity: 0.5; }
    100% { transform: translateY(0px) scale(1); opacity: 0.25; }
  }
  @keyframes shimBtn {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes panelSlideIn {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes formSlideIn {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes lineGrow {
    from { transform: scaleX(0); opacity: 0; }
    to   { transform: scaleX(1); opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.04); }
  }
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes floatCard {
    0%   { transform: translateY(0px) rotate(-1deg); }
    50%  { transform: translateY(-10px) rotate(1deg); }
    100% { transform: translateY(0px) rotate(-1deg); }
  }
  @keyframes floatCard2 {
    0%   { transform: translateY(0px) rotate(2deg); }
    50%  { transform: translateY(-14px) rotate(-1deg); }
    100% { transform: translateY(0px) rotate(2deg); }
  }
  @keyframes floatCard3 {
    0%   { transform: translateY(0px); }
    50%  { transform: translateY(-8px); }
    100% { transform: translateY(0px); }
  }
  @keyframes inputFocusRipple {
    from { box-shadow: 0 0 0 0 rgba(109,40,217,0.3); }
    to   { box-shadow: 0 0 0 6px rgba(109,40,217,0); }
  }

  html, body { height: 100%; }

  .lp {
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    display: flex;
    background: #f0f0f7;
  }

  /* ═══════════════════════════════════════
     LEFT PANEL
  ═══════════════════════════════════════ */
  .lp-left {
    width: 48%;
    background: linear-gradient(145deg, #1e1b4b 0%, #3730a3 40%, #5b21b6 75%, #7c3aed 100%);
    background-size: 200% 200%;
    animation: gradientShift 8s ease infinite, panelSlideIn 0.8s cubic-bezier(0.22,1,0.36,1) both;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 56px 52px;
    position: relative;
    overflow: hidden;
  }

  .lp-left::before {
    content: '';
    position: absolute;
    width: 520px; height: 520px;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
    top: -160px; right: -160px;
    pointer-events: none;
  }
  .lp-left::after {
    content: '';
    position: absolute;
    width: 340px; height: 340px;
    border-radius: 50%;
    background: rgba(255,255,255,0.03);
    bottom: -110px; left: -80px;
    pointer-events: none;
  }

  .lp-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }
  .lp-orb-1 {
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%);
    top: 28%; left: 4%;
    animation: orbFloat 6s ease-in-out infinite;
  }
  .lp-orb-2 {
    width: 150px; height: 150px;
    background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
    top: 10%; right: 12%;
    animation: orbFloatReverse 7s ease-in-out infinite;
    animation-delay: 1s;
  }
  .lp-orb-3 {
    width: 90px; height: 90px;
    background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
    bottom: 18%; right: 22%;
    animation: orbFloat 8s ease-in-out infinite;
    animation-delay: 2s;
  }
  .lp-orb-4 {
    width: 55px; height: 55px;
    background: rgba(255,255,255,0.06);
    top: 52%; right: 8%;
    animation: orbFloatReverse 5s ease-in-out infinite;
    animation-delay: 0.5s;
  }

  /* brand */
  .lp-brand {
    display: flex; align-items: center; gap: 14px;
    position: relative; z-index: 1;
    animation: fadeDown 0.6s 0.2s ease both;
  }
  .lp-brand-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: rgba(255,255,255,0.13);
    border: 1.5px solid rgba(255,255,255,0.22);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  .lp-brand-name {
    font-size: 1.25rem; font-weight: 800;
    color: #fff; letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .lp-brand-sub {
    font-size: 11px; color: rgba(199,210,254,0.7);
    font-weight: 500; margin-top: 1px;
  }

  /* body */
  .lp-left-body {
    position: relative; z-index: 1;
    animation: fadeUp 0.7s 0.35s ease both;
  }
  .lp-left-title {
    font-size: clamp(2rem, 3.2vw, 2.8rem);
    font-weight: 900; color: #fff;
    line-height: 1.12; letter-spacing: -0.04em;
    margin-bottom: 18px;
  }
  .lp-left-title em {
    font-style: normal;
    color: rgba(199,210,254,0.9);
  }
  .lp-left-desc {
    font-size: 15px; color: rgba(255,255,255,0.5);
    line-height: 1.85; font-weight: 400; max-width: 320px;
  }

  .lp-divider {
    width: 56px; height: 4px;
    background: linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1));
    border-radius: 99px; margin: 22px 0;
    transform-origin: left;
    animation: lineGrow 0.6s 0.8s ease both;
  }

  /* chips */
  .lp-chips {
    display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;
  }
  .lp-chip {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 99px; padding: 7px 16px;
    font-size: 12.5px; font-weight: 600;
    color: rgba(255,255,255,0.8);
    animation: chipIn 0.5s ease both;
    display: flex; align-items: center; gap: 6px;
    backdrop-filter: blur(4px);
  }
  .lp-chip:nth-child(1) { animation-delay: 0.7s; }
  .lp-chip:nth-child(2) { animation-delay: 0.85s; }
  .lp-chip:nth-child(3) { animation-delay: 1.0s; }
  .lp-chip:nth-child(4) { animation-delay: 1.15s; }
  .lp-chip i { font-size: 11px; opacity: 0.8; }

  /* floating stat cards */
  .lp-cards {
    display: flex; gap: 14px; margin-top: 36px;
    position: relative; z-index: 1;
  }
  .lp-card {
    flex: 1;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.13);
    border-radius: 18px; padding: 18px 16px;
    backdrop-filter: blur(8px);
    text-align: center;
  }
  .lp-card:nth-child(1) { animation: floatCard 5s ease-in-out infinite; animation-delay: 0s; }
  .lp-card:nth-child(2) { animation: floatCard2 6s ease-in-out infinite; animation-delay: 0.8s; }
  .lp-card:nth-child(3) { animation: floatCard3 4.5s ease-in-out infinite; animation-delay: 1.5s; }
  .lp-card-val {
    font-size: 1.8rem; font-weight: 900; color: #fff;
    letter-spacing: -0.04em; line-height: 1;
  }
  .lp-card-lbl {
    font-size: 10.5px; color: rgba(255,255,255,0.5);
    font-weight: 600; margin-top: 5px; text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .lp-card-icon {
    font-size: 18px; color: rgba(199,210,254,0.7); margin-bottom: 8px;
  }

  /* footer */
  .lp-left-footer {
    position: relative; z-index: 1;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 22px;
    display: flex; align-items: center; justify-content: space-between;
    animation: fadeIn 0.8s 0.5s ease both;
  }
  .lp-left-footer-text {
    font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 500;
  }
  .lp-left-footer-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 8px rgba(74,222,128,0.6);
    animation: pulse 2s ease-in-out infinite;
  }
  .lp-left-footer-status {
    font-size: 11.5px; color: rgba(255,255,255,0.4);
    display: flex; align-items: center; gap: 6px;
  }

  /* ═══════════════════════════════════════
     RIGHT PANEL
  ═══════════════════════════════════════ */
  .lp-right {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 56px 48px;
    background: #fff;
    animation: formSlideIn 0.8s 0.1s cubic-bezier(0.22,1,0.36,1) both;
    position: relative;
    overflow: hidden;
  }
  .lp-right::before {
    content: '';
    position: absolute;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(109,40,217,0.04) 0%, transparent 70%);
    top: -100px; right: -100px;
    pointer-events: none;
  }
  .lp-right::after {
    content: '';
    position: absolute;
    width: 300px; height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(55,48,163,0.03) 0%, transparent 70%);
    bottom: -80px; left: -80px;
    pointer-events: none;
  }

  .lp-form-box {
    width: 100%; max-width: 440px;
    position: relative; z-index: 1;
  }

  /* welcome badge */
  .lp-welcome-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: linear-gradient(135deg, #ede9fe, #ddd6fe);
    border: 1px solid #c4b5fd;
    border-radius: 99px; padding: 7px 16px;
    font-size: 12px; font-weight: 700; color: #6d28d9;
    margin-bottom: 22px;
    animation: fadeDown 0.5s 0.25s ease both;
    letter-spacing: 0.02em;
  }
  .lp-welcome-badge i { font-size: 11px; }

  .lp-form-title {
    font-size: 2rem; font-weight: 900;
    color: #0f172a; letter-spacing: -0.04em;
    margin-bottom: 8px; line-height: 1.15;
    animation: fadeDown 0.5s 0.35s ease both;
  }
  .lp-form-sub {
    font-size: 14.5px; color: #94a3b8; font-weight: 500;
    margin-bottom: 36px; line-height: 1.65;
    animation: fadeDown 0.5s 0.42s ease both;
  }

  /* fields */
  .lp-field { margin-bottom: 22px; }
  .lp-field:nth-child(1) { animation: fadeUp 0.5s 0.48s ease both; }
  .lp-field:nth-child(2) { animation: fadeUp 0.5s 0.56s ease both; }

  .lp-label {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 9px;
  }
  .lp-label-text {
    font-size: 12.5px; font-weight: 700;
    color: #475569; text-transform: uppercase; letter-spacing: 0.08em;
  }

  .lp-input-wrap { position: relative; }
  .lp-input {
    width: 100%; height: 56px; border-radius: 14px;
    border: 2px solid #e8ecf4; background: #f8faff;
    padding: 0 50px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px; font-weight: 600; color: #0f172a; outline: none;
    transition: border-color 0.25s, box-shadow 0.25s, background 0.25s, transform 0.15s;
  }
  .lp-input::placeholder { color: #c0c9d8; font-weight: 400; font-size: 14px; }
  .lp-input:focus {
    border-color: #7c3aed; background: #fff;
    box-shadow: 0 0 0 4px rgba(124,58,237,0.1);
    transform: translateY(-1px);
    animation: inputFocusRipple 0.4s ease;
  }
  .lp-input:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .lp-input-icon {
    position: absolute; left: 17px; top: 50%;
    transform: translateY(-50%);
    color: #c0c9d8; pointer-events: none; font-size: 16px;
    transition: color 0.2s, transform 0.2s;
  }
  .lp-input-wrap:focus-within .lp-input-icon {
    color: #7c3aed;
    transform: translateY(-50%) scale(1.1);
  }
  .lp-eye {
    position: absolute; right: 16px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: #c0c9d8; padding: 4px; display: flex; align-items: center;
    transition: color 0.2s;
    border-radius: 6px;
  }
  .lp-eye:hover { color: #7c3aed; background: rgba(124,58,237,0.07); }

  /* strength bar (password) */
  .lp-strength-bar {
    display: flex; gap: 4px; margin-top: 8px;
  }
  .lp-strength-seg {
    flex: 1; height: 3px; border-radius: 99px;
    background: #e8ecf4; transition: background 0.3s;
  }
  .lp-strength-seg.active { background: #7c3aed; }

  /* submit button */
  .lp-btn {
    width: 100%; height: 58px; border-radius: 14px;
    border: none; color: #fff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15.5px; font-weight: 800; cursor: pointer;
    background: linear-gradient(90deg, #1e1b4b, #3730a3, #7c3aed, #3730a3, #1e1b4b);
    background-size: 300% auto;
    animation: shimBtn 4s linear infinite, fadeUp 0.5s 0.64s ease both;
    box-shadow: 0 10px 32px rgba(91,33,182,0.35), 0 2px 8px rgba(91,33,182,0.2);
    transition: filter 0.2s, transform 0.2s, box-shadow 0.2s;
    display: flex; align-items: center; justify-content: center;
    gap: 10px; margin-top: 10px; letter-spacing: -0.01em;
    position: relative; overflow: hidden;
  }
  .lp-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
    border-radius: 14px;
  }
  .lp-btn:hover:not(:disabled) {
    filter: brightness(1.12); transform: translateY(-3px);
    box-shadow: 0 18px 42px rgba(91,33,182,0.45), 0 4px 12px rgba(91,33,182,0.25);
  }
  .lp-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 6px 18px rgba(91,33,182,0.3);
  }
  .lp-btn:disabled {
    background: #e2e8f0; animation: none;
    box-shadow: none; cursor: not-allowed; color: #94a3b8;
  }
  .lp-btn:disabled::before { display: none; }

  .lp-spinner {
    width: 20px; height: 20px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff; border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* divider */
  .lp-or {
    display: flex; align-items: center; gap: 12px;
    margin: 26px 0;
    animation: fadeIn 0.5s 0.7s ease both;
  }
  .lp-or-line { flex: 1; height: 1px; background: #f1f5f9; }
  .lp-or-text { font-size: 12px; color: #cbd5e1; font-weight: 600; }

  /* info cards below form */
  .lp-info-row {
    display: flex; gap: 10px; margin-top: 6px;
    animation: fadeUp 0.5s 0.72s ease both;
  }
  .lp-info-card {
    flex: 1; background: #f8faff;
    border: 1.5px solid #e8ecf4; border-radius: 12px;
    padding: 14px 12px; text-align: center;
    transition: border-color 0.2s, transform 0.2s;
  }
  .lp-info-card:hover {
    border-color: #c4b5fd; transform: translateY(-2px);
  }
  .lp-info-card-icon { font-size: 20px; color: #7c3aed; margin-bottom: 6px; }
  .lp-info-card-label { font-size: 11px; color: #94a3b8; font-weight: 600; }

  /* footer */
  .lp-form-footer {
    text-align: center; margin-top: 28px;
    font-size: 13px; color: #94a3b8; font-weight: 500;
    animation: fadeUp 0.5s 0.78s ease both;
  }
  .lp-form-footer a {
    color: #7c3aed; font-weight: 700; text-decoration: none;
    transition: color 0.2s;
  }
  .lp-form-footer a:hover { color: #5b21b6; text-decoration: underline; }

  .lp-security {
    display: flex; align-items: center; justify-content: center;
    gap: 6px; margin-top: 18px;
    font-size: 11.5px; color: #cbd5e1; font-weight: 500;
    animation: fadeIn 0.5s 0.85s ease both;
  }
  .lp-security i { font-size: 12px; color: #4ade80; }

  @media (max-width: 900px) {
    .lp-left { display: none; }
    .lp-right { padding: 40px 28px; }
    .lp-form-box { max-width: 100%; }
  }
  @media (max-width: 480px) {
    .lp-right { padding: 32px 20px; }
    .lp-btn { height: 54px; font-size: 14.5px; }
    .lp-input { height: 52px; font-size: 14px; }
    .lp-form-title { font-size: 1.7rem; }
  }
`;

export default function LoginPage() {
  const router   = useRouter();
  const toastRef = useRef<ToastHandle>(null);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9!@#$%^&*]/.test(password)) s++;
    setPwStrength(s);
  }, [password]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        { email, password }
      );
      const data = res.data;

      if (data.status !== 'success' || !data.data?.token) {
        toastRef.current?.showToast('01', data.message || 'Login gagal');
        setLoading(false);
        return;
      }

      const { token, user } = data.data;
      localStorage.setItem('TOKEN',      token);
      localStorage.setItem('ROLE',       user.role);
      localStorage.setItem('USER_NAME',  user.full_name);
      localStorage.setItem('USER_EMAIL', user.email);
      localStorage.setItem('USER_ID',    String(user.id));

      toastRef.current?.showToast('00', `Selamat datang, ${user.full_name}!`);
      setTimeout(() => router.push(roleRoutes[user.role] || '/'), 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Koneksi ke server gagal';
      toastRef.current?.showToast('01', msg);
      setLoading(false);
    }
  };

  return (
    <>
      <ToastNotifier ref={toastRef} />
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />

      <div className="lp">

        {/* ── LEFT ── */}
        <div className="lp-left">
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-orb lp-orb-3" />
          <div className="lp-orb lp-orb-4" />

          {/* brand */}
          <div className="lp-brand">
            <div className="lp-brand-icon">
              <i className="pi pi-cog" style={{ color: '#fff', fontSize: '1.25rem' }} />
            </div>
            <div>
              <div className="lp-brand-name">ERP Jadwal</div>
              <div className="lp-brand-sub">Sistem Penjadwalan Produksi</div>
            </div>
          </div>

          {/* body */}
          <div className="lp-left-body">
            <h1 className="lp-left-title">
              Jadwal Produksi<br />
              <em>Lebih Cerdas,</em><br />
              Lebih Efisien
            </h1>
            <div className="lp-divider" />
            <p className="lp-left-desc">
              Optimasi jadwal produksi otomatis menggunakan Fuzzy Mamdani dan algoritma CCEA untuk minimasi makespan dan efisiensi mesin.
            </p>
            <div className="lp-chips" style={{ marginTop: 20 }}>
              {[
                { icon: 'pi-sliders-h', label: 'Fuzzy Mamdani' },
                { icon: 'pi-chart-line', label: 'CCEA' },
                { icon: 'pi-chart-bar', label: 'Gantt Chart' },
                { icon: 'pi-bell', label: 'Auto Notifikasi' },
              ].map(c => (
                <span key={c.label} className="lp-chip">
                  <i className={`pi ${c.icon}`} />
                  {c.label}
                </span>
              ))}
            </div>

            {/* stat cards */}
            <div className="lp-cards">
              {[
                { icon: 'pi-server', val: '99%', lbl: 'Uptime' },
                { icon: 'pi-bolt', val: '3x', lbl: 'Lebih Cepat' },
                { icon: 'pi-check-circle', val: '100%', lbl: 'Akurasi' },
              ].map(c => (
                <div key={c.lbl} className="lp-card">
                  <div className="lp-card-icon"><i className={`pi ${c.icon}`} /></div>
                  <div className="lp-card-val">{c.val}</div>
                  <div className="lp-card-lbl">{c.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* footer */}
          <div className="lp-left-footer">
            <span className="lp-left-footer-text">Universitas Sebelas Maret · 2025</span>
            <div className="lp-left-footer-status">
              <div className="lp-left-footer-dot" />
              <span>Sistem Online</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="lp-right">
          <div className="lp-form-box">

            <div className="lp-welcome-badge">
              <i className="pi pi-star-fill" />
              Selamat Datang Kembali
            </div>

            <h2 className="lp-form-title">Masuk ke Sistem</h2>
            <p className="lp-form-sub">
              Gunakan akun yang telah diberikan oleh administrator untuk mengakses sistem ERP penjadwalan produksi.
            </p>

            <form onSubmit={handleSubmit} autoComplete="off">

              <div className="lp-field">
                <div className="lp-label">
                  <span className="lp-label-text">Alamat Email</span>
                </div>
                <div className="lp-input-wrap">
                  <input
                    id="email"
                    type="email"
                    className="lp-input"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <i className="pi pi-envelope lp-input-icon" />
                </div>
              </div>

              <div className="lp-field">
                <div className="lp-label">
                  <span className="lp-label-text">Password</span>
                </div>
                <div className="lp-input-wrap">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className="lp-input"
                    placeholder="Masukkan password Anda"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <i className="pi pi-lock lp-input-icon" />
                  <button
                    type="button"
                    className="lp-eye"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    disabled={loading}
                  >
                    <i className={`pi ${showPass ? 'pi-eye-slash' : 'pi-eye'}`} style={{ fontSize: 15 }} />
                  </button>
                </div>
                {password && (
                  <div className="lp-strength-bar">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`lp-strength-seg ${i < pwStrength ? 'active' : ''}`} />
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="lp-btn" disabled={loading || !email || !password}>
                {loading ? (
                  <><div className="lp-spinner" /> Memverifikasi Akun...</>
                ) : (
                  <><i className="pi pi-sign-in" /> Masuk ke Sistem</>
                )}
              </button>

            </form>

            <div className="lp-or">
              <div className="lp-or-line" />
              <span className="lp-or-text">FITUR SISTEM</span>
              <div className="lp-or-line" />
            </div>

            <div className="lp-info-row">
              {[
                { icon: 'pi-calendar', label: 'Penjadwalan' },
                { icon: 'pi-box', label: 'Stok Bahan' },
                { icon: 'pi-chart-bar', label: 'Laporan' },
              ].map(c => (
                <div key={c.label} className="lp-info-card">
                  <div className="lp-info-card-icon"><i className={`pi ${c.icon}`} /></div>
                  <div className="lp-info-card-label">{c.label}</div>
                </div>
              ))}
            </div>

            <p className="lp-form-footer">
              Butuh bantuan akses?{' '}
              <a href="mailto:support@erpjadwal.com">Hubungi IT Support</a>
            </p>

            <div className="lp-security">
              <i className="pi pi-shield" />
              <span>Koneksi aman dengan enkripsi SSL/TLS</span>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}