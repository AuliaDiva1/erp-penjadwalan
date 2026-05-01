/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { classNames } from "primereact/utils";
import React, { forwardRef, useContext, useRef, useEffect, useState } from "react";
import { LayoutContext } from "./context/layoutcontext";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import axios from "axios";
import { useRouter } from "next/navigation";
import ToastNotifier from "../app/components/ToastNotifier";

const AppTopbar = forwardRef((props, ref) => {
    const { layoutConfig, layoutState, onMenuToggle } = useContext(LayoutContext);
    const menubuttonRef = useRef(null);
    const topbarmenuRef = useRef(null);
    const profileOverlayRef = useRef(null);
    const router = useRouter();

    const [userData, setUserData] = useState({
        name: "User",
        role: "Guest",
        email: ""
    });

    const toastRef = useRef(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setUserData({
                name: localStorage.getItem("USER_NAME") || "User",
                role: localStorage.getItem("ROLE") || "Guest",
                email: localStorage.getItem("USER_EMAIL") || ""
            });
        }
    }, []);

    const handleLogout = async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("TOKEN") : null;

        try {
            if (token) {
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            toastRef.current?.showToast("00", "Logout berhasil");
        } catch (error) {
            console.error("Logout gagal:", error);
        } finally {
            localStorage.clear(); // Bersihkan semua sekaligus
            router.replace("/");
        }
    };

    return (
        <div className="layout-topbar">
            <ToastNotifier ref={toastRef} />

            <Link href="/" className="layout-topbar-logo">
                <img 
                    src={`/layout/images/logo-${layoutConfig.colorScheme !== 'light' ? 'white' : 'dark'}.svg`} 
                    width="47.22px" 
                    height={'35px'} 
                    alt="logo" 
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
                {/* Tombol Kalender Tetap Ada */}
                <button type="button" className="p-link layout-topbar-button">
                    <i className="pi pi-calendar"></i>
                    <span>Calendar</span>
                </button>

                {/* Tombol Profil dengan Avatar Kecil */}
                <button
                    type="button"
                    className="p-link layout-topbar-button"
                    onClick={(e) => profileOverlayRef.current?.toggle(e)}
                >
                    <i className="pi pi-user"></i>
                    <span>Profile</span>
                </button>
            </div>

            {/* Overlay Panel yang Dipercantik */}
            <OverlayPanel ref={profileOverlayRef} style={{ width: '280px' }} className="p-0">
                <div className="flex flex-column align-items-center p-4">
                    {/* Bagian Foto Profil Besar */}
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