'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ToastNotifier from '../../../components/ToastNotifier';
import axios from 'axios';
import { roleRoutes } from '../../../../utils/roleRoutes';

type ToastHandle = { showToast: (status: string, message?: string) => void };

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shimBtn  { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
  @keyframes spin     { to { transform:rotate(360deg); } }
  @keyframes aurora1  { 0%,100% { transform:translateX(0) translateY(0) scale(1); opacity:.8; } 50% { transform:translateX(80px) translateY(-40px) scale(1.1); opacity:1; } }
  @keyframes aurora2  { 0%,100% { transform:translateX(0) translateY(0) scale(1); opacity:.7; } 50% { transform:translateX(-60px) translateY(30px) scale(1.08); opacity:.9; } }
  @keyframes aurora3  { 0%,100% { transform:translateX(0) scale(1); opacity:.6; } 50% { transform:translateX(40px) scale(1.12); opacity:.8; } }

  html, body { height:100%; font-family:'Poppins',sans-serif; }

  .lp {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#f5f3ff; position:relative; overflow:hidden; padding:24px;
  }

  .lp-aurora { position:absolute; inset:0; pointer-events:none; z-index:0; }
  .lp-aurora-1 {
    position:absolute; width:700px; height:180px;
    background:linear-gradient(90deg, transparent, rgba(124,58,237,.25), rgba(168,85,247,.3), rgba(109,40,217,.2), transparent);
    border-radius:50%; filter:blur(60px); opacity:.8;
    bottom:30%; left:-100px;
    animation:aurora1 8s ease-in-out infinite;
  }
  .lp-aurora-2 {
    position:absolute; width:500px; height:120px;
    background:linear-gradient(90deg, transparent, rgba(59,130,246,.15), rgba(139,92,246,.2), transparent);
    border-radius:50%; filter:blur(50px); opacity:.7;
    bottom:25%; left:10%;
    animation:aurora2 10s ease-in-out infinite .5s;
  }
  .lp-aurora-3 {
    position:absolute; width:400px; height:100px;
    background:linear-gradient(90deg, transparent, rgba(6,182,212,.15), rgba(124,58,237,.2), transparent);
    border-radius:50%; filter:blur(45px); opacity:.6;
    bottom:28%; right:5%;
    animation:aurora3 12s ease-in-out infinite 1s;
  }
  .lp-dot-grid {
    position:absolute; inset:0;
    background-image:radial-gradient(rgba(109,40,217,.08) 1px, transparent 1px);
    background-size:32px 32px;
  }

  .lp-card {
    position:relative; z-index:1; width:100%; max-width:420px;
    background:rgba(255,255,255,.8);
    border:1px solid rgba(139,92,246,.15);
    border-radius:20px; padding:40px 36px;
    backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px);
    animation:fadeUp .6s .1s both;
    box-shadow:0 8px 40px rgba(109,40,217,.08);
  }

  .lp-brand { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
  .lp-brand-ico {
    width:38px; height:38px; border-radius:10px;
    background:rgba(109,40,217,.1); border:1px solid rgba(109,40,217,.2);
    display:flex; align-items:center; justify-content:center;
  }
  .lp-brand-name { font-size:14px; font-weight:600; color:#1e1b4b; }
  .lp-brand-sub  { font-size:11px; color:#94a3b8; }

  .lp-title { font-size:1.55rem; font-weight:700; color:#0f172a; letter-spacing:-.02em; margin-bottom:6px; }
  .lp-sub   { font-size:13px; color:#94a3b8; line-height:1.6; margin-bottom:28px; }

  .lp-field { margin-bottom:14px; }
  .lp-lbl   { font-size:11.5px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.07em; margin-bottom:7px; display:block; }

  .lp-inp-wrap { position:relative; }
  .lp-inp {
    width:100%; height:48px; border-radius:10px;
    border:1.5px solid #e2e8f0;
    background:#f8fafc;
    padding:0 42px; font-family:'Poppins',sans-serif;
    font-size:14px; color:#0f172a; outline:none;
    transition:border-color .2s, background .2s, box-shadow .2s;
  }
  .lp-inp::placeholder { color:#cbd5e1; font-size:13.5px; }
  .lp-inp:focus {
    border-color:#7c3aed;
    background:#fff;
    box-shadow:0 0 0 3px rgba(124,58,237,.1);
  }
  .lp-inp:disabled { opacity:.5; cursor:not-allowed; }
  .lp-ico-l {
    position:absolute; left:14px; top:50%; transform:translateY(-50%);
    color:#cbd5e1; font-size:14px; pointer-events:none; transition:color .2s;
  }
  .lp-inp-wrap:focus-within .lp-ico-l { color:#7c3aed; }
  .lp-eye-btn {
    position:absolute; right:12px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer;
    color:#cbd5e1; display:flex; align-items:center;
    padding:4px; border-radius:6px; transition:color .2s;
  }
  .lp-eye-btn:hover { color:#7c3aed; }

  .lp-btn {
    width:100%; height:48px; border-radius:10px; border:none; color:#fff;
    font-family:'Poppins',sans-serif; font-size:14px; font-weight:600; cursor:pointer;
    background:linear-gradient(90deg,#1e1b4b,#4c1d95,#7c3aed,#4c1d95,#1e1b4b);
    background-size:300% auto; animation:shimBtn 4s linear infinite;
    transition:filter .2s, transform .2s; margin-top:8px;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .lp-btn:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-2px); }
  .lp-btn:active:not(:disabled) { transform:translateY(0); }
  .lp-btn:disabled { background:#e2e8f0; animation:none; color:#94a3b8; cursor:not-allowed; }

  .lp-spinner { width:17px; height:17px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }

  .lp-divider { display:flex; align-items:center; gap:12px; margin:20px 0; }
  .lp-divider-line { flex:1; height:1px; background:#f1f5f9; }
  .lp-divider-txt  { font-size:11px; color:#cbd5e1; font-weight:500; }

  .lp-footer { text-align:center; }
  .lp-footer-txt  { font-size:12px; color:#94a3b8; }
  .lp-footer-link { font-size:12px; color:#7c3aed; text-decoration:none; font-weight:500; }
  .lp-footer-link:hover { color:#5b21b6; text-decoration:underline; }

  @media (max-width:480px) {
    .lp-card { padding:32px 24px; }
    .lp-title { font-size:1.35rem; }
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

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, { email, password });
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
      toastRef.current?.showToast('01', err.response?.data?.message || 'Koneksi ke server gagal');
      setLoading(false);
    }
  };

  return (
    <>
      <ToastNotifier ref={toastRef} />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lp">

        <div className="lp-aurora">
          <div className="lp-aurora-1" />
          <div className="lp-aurora-2" />
          <div className="lp-aurora-3" />
          <div className="lp-dot-grid" />
        </div>

        <div className="lp-card">
          <div className="lp-brand">
            <div className="lp-brand-ico">
              <i className="pi pi-cog" style={{ color:'#7c3aed', fontSize:'1rem' }} />
            </div>
            <div>
              <div className="lp-brand-name">ERP Penjadwalan</div>
              <div className="lp-brand-sub">Sistem Produksi Manufaktur</div>
            </div>
          </div>

          <h2 className="lp-title">Masuk ke Sistem</h2>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="lp-field">
              <label className="lp-lbl">Email</label>
              <div className="lp-inp-wrap">
                <input
                  type="email" className="lp-inp"
                  placeholder="email@gmail.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  disabled={loading} required
                />
                <i className="pi pi-envelope lp-ico-l" />
              </div>
            </div>

            <div className="lp-field">
              <label className="lp-lbl">Password</label>
              <div className="lp-inp-wrap">
                <input
                  type={showPass ? 'text' : 'password'} className="lp-inp"
                  placeholder="Masukkan password Anda"
                  value={password} onChange={e => setPassword(e.target.value)}
                  disabled={loading} required
                />
                <i className="pi pi-lock lp-ico-l" />
                <button type="button" className="lp-eye-btn"
                  onClick={() => setShowPass(v => !v)} tabIndex={-1} disabled={loading}>
                  <i className={`pi ${showPass ? 'pi-eye-slash' : 'pi-eye'}`} style={{ fontSize:13 }} />
                </button>
              </div>
            </div>

            <button type="submit" className="lp-btn" disabled={loading || !email || !password}>
              {loading
                ? <><div className="lp-spinner" /> Memverifikasi...</>
                : <><i className="pi pi-sign-in" style={{ fontSize:14 }} /> Masuk ke Sistem</>
              }
            </button>
          </form>

          <div className="lp-footer">
            <span className="lp-footer-txt">Butuh bantuan? </span>
            <a href="mailto:support@erpjadwal.com" className="lp-footer-link">Hubungi IT Support</a>
          </div>
        </div>

      </div>
    </>
  );
}