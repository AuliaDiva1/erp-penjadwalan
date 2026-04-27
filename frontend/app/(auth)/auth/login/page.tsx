'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ToastNotifier from '../../../components/ToastNotifier';
import axios from 'axios';
import { roleRoutes } from '../../../../utils/roleRoutes';

type ToastHandle = { showToast: (status: string, message?: string) => void };

const LOGIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes chipIn {
    from { opacity: 0; transform: scale(0.75) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes orbFloat {
    0%   { transform: translateY(0px)   scale(1);    opacity: 0.4; }
    50%  { transform: translateY(-18px) scale(1.08); opacity: 0.65; }
    100% { transform: translateY(0px)   scale(1);    opacity: 0.4; }
  }
  @keyframes orbFloatReverse {
    0%   { transform: translateY(0px)  scale(1);    opacity: 0.3; }
    50%  { transform: translateY(14px) scale(1.05); opacity: 0.55; }
    100% { transform: translateY(0px)  scale(1);    opacity: 0.3; }
  }
  @keyframes shimBtn {
    0%   { background-position: 0%   50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0%   50%; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes panelSlideIn {
    from { opacity: 0; transform: translateX(-30px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes formSlideIn {
    from { opacity: 0; transform: translateX(30px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes lineGrow {
    from { transform: scaleX(0); opacity: 0; }
    to   { transform: scaleX(1); opacity: 1; }
  }

  .login-page {
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
    display: flex;
    background: #f1f0fb;
  }

  .login-left {
    width: 44%;
    background: linear-gradient(145deg, #3730a3 0%, #5b21b6 55%, #6d28d9 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 48px 44px;
    position: relative;
    overflow: hidden;
    animation: panelSlideIn 0.7s cubic-bezier(0.22,1,0.36,1) both;
  }
  .login-left::before {
    content: '';
    position: absolute;
    width: 420px; height: 420px;
    border-radius: 50%;
    background: rgba(255,255,255,0.05);
    top: -130px; right: -130px;
    pointer-events: none;
  }
  .login-left::after {
    content: '';
    position: absolute;
    width: 290px; height: 290px;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
    bottom: -90px; left: -65px;
    pointer-events: none;
  }

  .login-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }
  .login-orb-1 {
    width: 210px; height: 210px;
    background: rgba(255,255,255,0.07);
    top: 30%; left: 6%;
    animation: orbFloat 5s ease-in-out infinite;
  }
  .login-orb-2 {
    width: 120px; height: 120px;
    background: rgba(255,255,255,0.05);
    top: 12%; right: 14%;
    animation: orbFloatReverse 6s ease-in-out infinite;
    animation-delay: 1s;
  }
  .login-orb-3 {
    width: 75px; height: 75px;
    background: rgba(255,255,255,0.04);
    bottom: 20%; right: 26%;
    animation: orbFloat 7s ease-in-out infinite;
    animation-delay: 2.5s;
  }
  .login-orb-4 {
    width: 45px; height: 45px;
    background: rgba(255,255,255,0.06);
    top: 55%; right: 10%;
    animation: orbFloatReverse 4.5s ease-in-out infinite;
    animation-delay: 0.8s;
  }

  .login-brand {
    display: flex; align-items: center; gap: 10px;
    position: relative; z-index: 1;
    animation: fadeDown 0.6s 0.2s ease both;
  }
  .login-brand-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center;
  }
  .login-brand-name {
    font-size: 1.1rem; font-weight: 700;
    color: #fff; letter-spacing: -0.02em;
  }
  .login-brand-name span { color: rgba(199,210,254,0.85); }

  .login-left-body {
    position: relative; z-index: 1;
    animation: fadeUp 0.7s 0.35s ease both;
  }
  .login-left-title {
    font-size: clamp(1.8rem, 3vw, 2.4rem);
    font-weight: 800; color: #fff;
    line-height: 1.15; letter-spacing: -0.03em;
    margin-bottom: 16px;
  }
  .login-left-title span { color: rgba(199,210,254,0.9); }
  .login-left-desc {
    font-size: 13.5px; color: rgba(255,255,255,0.45);
    line-height: 1.8; font-weight: 400; max-width: 300px;
  }

  .login-divider {
    width: 48px; height: 3px;
    background: rgba(255,255,255,0.3);
    border-radius: 99px; margin: 20px 0;
    transform-origin: left;
    animation: lineGrow 0.6s 0.8s ease both;
  }

  .login-chips {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
  }
  .login-chip {
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 99px; padding: 5px 12px;
    font-size: 11.5px; font-weight: 500;
    color: rgba(255,255,255,0.75);
    animation: chipIn 0.5s ease both;
  }
  .login-chip:nth-child(1) { animation-delay: 0.7s; }
  .login-chip:nth-child(2) { animation-delay: 0.85s; }
  .login-chip:nth-child(3) { animation-delay: 1.0s; }
  .login-chip:nth-child(4) { animation-delay: 1.15s; }

  .login-left-footer {
    position: relative; z-index: 1;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 20px; font-size: 11px;
    color: rgba(255,255,255,0.3); font-weight: 400;
    animation: fadeIn 0.8s 0.5s ease both;
  }

  .login-right {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 48px 40px; background: #fff;
    animation: formSlideIn 0.7s 0.1s cubic-bezier(0.22,1,0.36,1) both;
  }
  .login-form-box { width: 100%; max-width: 380px; }

  .login-form-title {
    font-size: 1.6rem; font-weight: 800;
    color: #0f172a; letter-spacing: -0.03em; margin-bottom: 6px;
    animation: fadeDown 0.5s 0.3s ease both;
  }
  .login-form-sub {
    font-size: 13px; color: #94a3b8;
    margin-bottom: 32px; line-height: 1.6;
    animation: fadeDown 0.5s 0.4s ease both;
  }

  .login-field { margin-bottom: 18px; }
  .login-field:nth-child(1) { animation: fadeUp 0.5s 0.45s ease both; }
  .login-field:nth-child(2) { animation: fadeUp 0.5s 0.55s ease both; }

  .login-label {
    display: block; font-size: 11px; font-weight: 700;
    color: #64748b; text-transform: uppercase;
    letter-spacing: 0.07em; margin-bottom: 7px;
  }
  .login-input-wrap { position: relative; }
  .login-input {
    width: 100%; height: 48px; border-radius: 10px;
    border: 1.5px solid #e8ecf4; background: #f8faff;
    padding: 0 42px;
    font-family: 'Poppins', sans-serif;
    font-size: 13.5px; font-weight: 500; color: #0f172a; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .login-input::placeholder { color: #c0c9d8; font-weight: 400; }
  .login-input:focus {
    border-color: #6d28d9; background: #fff;
    box-shadow: 0 0 0 3px rgba(109,40,217,0.09);
  }
  .login-input:disabled { opacity: 0.6; cursor: not-allowed; }
  .login-input-icon {
    position: absolute; left: 13px; top: 50%;
    transform: translateY(-50%);
    color: #c0c9d8; pointer-events: none; font-size: 14px;
    transition: color 0.2s;
  }
  .login-input-wrap:focus-within .login-input-icon { color: #6d28d9; }
  .login-eye {
    position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: #c0c9d8; padding: 0; display: flex; align-items: center;
    transition: color 0.2s;
  }
  .login-eye:hover { color: #6d28d9; }

  .login-btn {
    width: 100%; height: 50px; border-radius: 10px;
    border: none; color: #fff;
    font-family: 'Poppins', sans-serif;
    font-size: 14px; font-weight: 700; cursor: pointer;
    background: linear-gradient(90deg, #3730a3, #6d28d9, #3730a3);
    background-size: 200% auto;
    animation: shimBtn 3s linear infinite, fadeUp 0.5s 0.65s ease both;
    box-shadow: 0 8px 24px rgba(91,33,182,0.32);
    transition: filter 0.2s, transform 0.15s, box-shadow 0.2s;
    display: flex; align-items: center; justify-content: center;
    gap: 8px; margin-top: 8px;
  }
  .login-btn:hover:not(:disabled) {
    filter: brightness(1.1); transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(91,33,182,0.42);
  }
  .login-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(91,33,182,0.28);
  }
  .login-btn:disabled {
    background: #e2e8f0; animation: none;
    box-shadow: none; cursor: not-allowed; color: #94a3b8;
  }
  .login-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff; border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .login-footer-text {
    text-align: center; margin-top: 24px;
    font-size: 12.5px; color: #94a3b8;
    animation: fadeUp 0.5s 0.7s ease both;
  }
  .login-footer-text a { color: #6d28d9; font-weight: 600; text-decoration: none; }
  .login-footer-text a:hover { text-decoration: underline; }

  @media (max-width: 768px) {
    .login-left  { display: none; }
    .login-right { padding: 32px 24px; }
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

  // Fix hydration mismatch: only render on client
  useEffect(() => { setMounted(true); }, []);
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

      <div className="login-page">

        {/* LEFT */}
        <div className="login-left">
          <div className="login-orb login-orb-1" />
          <div className="login-orb login-orb-2" />
          <div className="login-orb login-orb-3" />
          <div className="login-orb login-orb-4" />

          <div className="login-brand">
            <div className="login-brand-icon">
              <i className="pi pi-cog" style={{ color: '#fff', fontSize: '1rem' }} />
            </div>
            <span className="login-brand-name">
              ERP<span>Jadwal</span>
            </span>
          </div>

          <div className="login-left-body">
            <h1 className="login-left-title">
              Sistem Penjadwalan<br />
              <span>Produksi Manufaktur</span>
            </h1>
            <div className="login-divider" />
            <p className="login-left-desc">
              Optimasi jadwal produksi menggunakan Fuzzy Mamdani dan CCEA untuk minimasi makespan secara otomatis.
            </p>
            <div className="login-chips">
              {['Fuzzy Mamdani', 'CCEA', 'Gantt Chart', 'Auto Notifikasi'].map(c => (
                <span key={c} className="login-chip">{c}</span>
              ))}
            </div>
          </div>

          <div className="login-left-footer">
            Universitas Sebelas Maret · 2025
          </div>
        </div>

        {/* RIGHT */}
        <div className="login-right">
          <div className="login-form-box">

            <h2 className="login-form-title">Selamat datang</h2>
            <p className="login-form-sub">Masuk untuk mengakses sistem ERP penjadwalan produksi.</p>

            <form onSubmit={handleSubmit} autoComplete="off">

              <div className="login-field">
                <label className="login-label" htmlFor="email">Email</label>
                <div className="login-input-wrap">
                  <input
                    id="email"
                    type="email"
                    className="login-input"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <i className="pi pi-envelope login-input-icon" />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="password">Password</label>
                <div className="login-input-wrap">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <i className="pi pi-lock login-input-icon" />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    disabled={loading}
                  >
                    <i className={`pi ${showPass ? 'pi-eye-slash' : 'pi-eye'}`} style={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <><div className="login-spinner" /> Memproses...</>
                ) : (
                  <><i className="pi pi-sign-in" /> Masuk ke Sistem</>
                )}
              </button>

            </form>

            <p className="login-footer-text">
              Butuh bantuan?{' '}
              <a href="mailto:support@erpjadwal.com">Hubungi IT Support</a>
            </p>

          </div>
        </div>

      </div>
    </>
  );
}
