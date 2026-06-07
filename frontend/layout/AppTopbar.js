/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { classNames } from "primereact/utils";
import React, { forwardRef, useContext, useRef, useEffect, useState, useCallback } from "react";
import { LayoutContext } from "./context/layoutcontext";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import axios from "axios";
import { useRouter } from "next/navigation";
import ToastNotifier from "../app/components/ToastNotifier";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const AppTopbar = forwardRef((props, ref) => {
    const { layoutConfig, layoutState, onMenuToggle } = useContext(LayoutContext);
    const menubuttonRef     = useRef(null);
    const topbarmenuRef     = useRef(null);
    const profileOverlayRef = useRef(null);
    const notifOverlayRef   = useRef(null);
    const router = useRouter();

    const [userData,     setUserData]     = useState({ name: "User", role: "Guest", email: "" });
    const [procurements, setProcurements] = useState([]);
    const [userRole,     setUserRole]     = useState(null);
    const toastRef = useRef(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setUserData({
                name:  localStorage.getItem("USER_NAME")  || "User",
                role:  localStorage.getItem("ROLE")       || "Guest",
                email: localStorage.getItem("USER_EMAIL") || "",
            });
            setUserRole(localStorage.getItem("ROLE") || null);
        }
    }, []);

    const fetchPending = useCallback(async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("TOKEN") : null;
        if (!token) return;
        try {
            const res  = await fetch(`${BASE_URL}/procurements/pending`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setProcurements(data.data);
        } catch {}
    }, []);

    useEffect(() => {
        if (userRole === "STAFF_GUDANG") {
            fetchPending();
            const interval = setInterval(fetchPending, 60000);
            return () => clearInterval(interval);
        }
    }, [userRole, fetchPending]);

    const handleLogout = async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("TOKEN") : null;
        try {
            if (token) {
                await axios.post(
                    `${BASE_URL}/auth/logout`, {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            toastRef.current?.showToast("00", "Logout berhasil");
        } catch (error) {
            console.error("Logout gagal:", error);
        } finally {
            localStorage.clear();
            router.replace("/");
        }
    };

    const totalCount   = procurements.length;
    const pendingCount = procurements.filter(p => p.status === 'pending').length;

    const getStatusColor = (status) => {
        if (status === 'pending')     return '#f59e0b';
        if (status === 'in_progress') return '#3b82f6';
        return '#22c55e';
    };

    const getStatusLabel = (status) => {
        if (status === 'pending')     return 'Pending';
        if (status === 'in_progress') return 'Diproses';
        return 'Selesai';
    };

    return (
        <div className="layout-topbar">
            <ToastNotifier ref={toastRef} />

            <Link href="/" className="layout-topbar-logo">
                <img
                    src={`/layout/images/logo-${layoutConfig.colorScheme !== 'light' ? 'white' : 'dark'}.svg`}
                    width="47.22px" height="35px" alt="logo"
                />
                <span>{process.env.NEXT_PUBLIC_APP_NAME}</span>
            </Link>

            <button
                ref={menubuttonRef}
                type="button"
                className="p-link layout-menu-button layout-topbar-button"
                onClick={onMenuToggle}
            >
                <i className="pi pi-bars" />
            </button>

            <div
                ref={topbarmenuRef}
                className={classNames("layout-topbar-menu", {
                    "layout-topbar-menu-mobile-active": layoutState.profileSidebarVisible,
                })}
            >
                {/* Bell — hanya untuk STAFF_GUDANG */}
                {userRole === "STAFF_GUDANG" && (
                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                        <button
                            type="button"
                            className="p-link layout-topbar-button"
                            onClick={(e) => { fetchPending(); notifOverlayRef.current?.toggle(e); }}
                        >
                            <i className="pi pi-bell" style={{ fontSize: '1.25rem' }} />
                            <span>Notifikasi</span>
                        </button>
                        {totalCount > 0 && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    background: pendingCount > 0 ? '#ef4444' : '#f59e0b',
                                    color: '#fff',
                                    borderRadius: '50%',
                                    minWidth: '18px',
                                    height: '18px',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1,
                                    padding: '0 3px',
                                    pointerEvents: 'none',
                                    zIndex: 10,
                                    boxShadow: '0 0 0 2px var(--surface-card)',
                                }}
                            >
                                {totalCount > 99 ? '99+' : totalCount}
                            </span>
                        )}
                    </div>
                )}

                {/* Profil */}
                <button
                    type="button"
                    className="p-link layout-topbar-button"
                    onClick={(e) => profileOverlayRef.current?.toggle(e)}
                >
                    <i className="pi pi-user" />
                    <span>Profile</span>
                </button>
            </div>

            {/* Overlay Notifikasi */}
            <OverlayPanel ref={notifOverlayRef} style={{ width: '360px' }} className="p-0">
                <div
                    className="flex justify-content-between align-items-center px-3 py-3"
                    style={{ borderBottom: '1px solid var(--surface-border)' }}
                >
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-bell text-primary" />
                        <span className="font-bold text-900">Notifikasi Pengadaan</span>
                        {totalCount > 0 && (
                            <span
                                style={{
                                    background: pendingCount > 0 ? '#ef4444' : '#f59e0b',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    padding: '1px 7px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                }}
                            >
                                {totalCount}
                            </span>
                        )}
                    </div>
                    <Button
                        icon="pi pi-refresh"
                        text rounded size="small"
                        tooltip="Refresh"
                        onClick={fetchPending}
                    />
                </div>

                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {procurements.length === 0 ? (
                        <div className="flex flex-column align-items-center justify-content-center p-5 gap-2">
                            <i className="pi pi-check-circle text-green-500" style={{ fontSize: '2rem' }} />
                            <span className="text-color-secondary text-sm">Semua pengadaan sudah ditangani</span>
                        </div>
                    ) : (
                        procurements.map((p, i) => (
                            <div
                                key={p.id}
                                className="flex align-items-start gap-3 px-3 py-3"
                                style={{
                                    borderBottom: i < procurements.length - 1 ? '1px solid var(--surface-border)' : 'none',
                                    background: p.status === 'pending' ? 'var(--surface-ground)' : 'transparent',
                                }}
                            >
                                <div
                                    style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: getStatusColor(p.status),
                                        marginTop: 5, flexShrink: 0,
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-content-between align-items-center gap-2">
                                        <span
                                            className="font-semibold text-900 text-sm"
                                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        >
                                            {p.material_name}
                                        </span>
                                        <span
                                            className="text-xs font-medium flex-shrink-0"
                                            style={{ color: getStatusColor(p.status) }}
                                        >
                                            {getStatusLabel(p.status)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-color-secondary mt-1">
                                        Stok saat notif:{' '}
                                        <span className="text-red-500 font-medium">
                                            {p.current_stock_at_trigger} {p.nama_satuan}
                                        </span>
                                    </div>
                                    <div className="text-xs text-color-secondary">
                                        {p.is_auto ? 'Otomatis' : 'Manual'} &middot;{' '}
                                        {new Date(p.created_at).toLocaleDateString('id-ID', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ borderTop: '1px solid var(--surface-border)' }} className="p-2">
                    <Link href="/gudang/pengadaan/notifikasi">
                        <Button
                            label="Lihat Semua Pengadaan"
                            icon="pi pi-arrow-right"
                            iconPos="right"
                            text
                            className="w-full justify-content-center text-sm"
                            onClick={() => notifOverlayRef.current?.hide()}
                        />
                    </Link>
                </div>
            </OverlayPanel>

            {/* Overlay Profil */}
            <OverlayPanel ref={profileOverlayRef} style={{ width: '280px' }} className="p-0">
                <div className="flex flex-column align-items-center p-4">
                    <Avatar
                        label={userData.name.charAt(0).toUpperCase()}
                        size="xlarge"
                        shape="circle"
                        className="mb-3 bg-primary text-white"
                        style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}
                    />
                    <span className="font-bold text-xl text-900">{userData.name}</span>
                    <span className="text-600 font-medium mb-1">{userData.role}</span>
                    <span className="text-500 text-sm">{userData.email}</span>
                </div>

                <Divider className="m-0" />

                <div className="flex flex-column p-2">
                    <Link href="/profile" className="w-full">
                        <Button
                            label="Pengaturan Profil"
                            icon="pi pi-user-edit"
                            className="p-button-text w-full text-left justify-content-start text-700"
                            onClick={() => profileOverlayRef.current?.hide()}
                        />
                    </Link>
                    <Link href="/settings" className="w-full">
                        <Button
                            label="Keamanan"
                            icon="pi pi-lock"
                            className="p-button-text w-full text-left justify-content-start text-700"
                            onClick={() => profileOverlayRef.current?.hide()}
                        />
                    </Link>

                    <Divider className="my-2" />

                    <Button
                        label="Keluar Aplikasi"
                        icon="pi pi-sign-out"
                        className="p-button-text p-button-danger w-full text-left justify-content-start"
                        onClick={handleLogout}
                    />
                </div>
            </OverlayPanel>
        </div>
    );
});

AppTopbar.displayName = "AppTopbar";

export default AppTopbar;