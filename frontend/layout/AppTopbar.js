/* eslint-disable @next/next/no-img-element */

"use client";

import Link from "next/link";
import { classNames } from "primereact/utils";
import React, { forwardRef, useContext, useRef, useEffect, useState } from "react";
import { LayoutContext } from "./context/layoutcontext";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import ToastNotifier from "../app/components/ToastNotifier";

const AppTopbar = forwardRef((props, ref) => {
    const { layoutConfig, layoutState, onMenuToggle } = useContext(LayoutContext);
    const menubuttonRef = useRef(null);
    const topbarmenuRef = useRef(null);
    const profileOverlayRef = useRef(null);
    const router = useRouter();

    const [role, setRole] = useState("Guest");
    const [name, setName] = useState("User");

    // toast ref
    const toastRef = useRef(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedRole = localStorage.getItem("ROLE");
            const storedName = localStorage.getItem("USER_NAME");

            if (storedRole) setRole(storedRole);
            if (storedName) setName(storedName);
        }
    }, []);

    const handleLogout = async () => {
    const token =
        typeof window !== "undefined"
        ? localStorage.getItem("TOKEN") 
        : null;

    try {
        if (token) {
        await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
            {},
            {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            }
        );

        toastRef.current?.showToast("00", "Logout berhasil");
        }
    } catch (error) {
        console.error("Logout gagal:", error);
        toastRef.current?.showToast("01", "Logout gagal");
    } finally {
        // ✅ HAPUS SEMUA SESSION
        localStorage.removeItem("TOKEN");
        localStorage.removeItem("ROLE");
        localStorage.removeItem("USER_NAME");
        localStorage.removeItem("USER_EMAIL");
        localStorage.removeItem("USER_ID");

        router.replace("/auth/login");
    }
    };

    return (
        <div className="layout-topbar">
            <ToastNotifier ref={toastRef} />

            <Link href="/" className="layout-topbar-logo">
            <img src={`/layout/images/logo-${layoutConfig.colorScheme !== 'light' ? 'white' : 'dark'}.svg`} width="47.22px" height={'35px'} alt="logo" />
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
                <button type="button" className="p-link layout-topbar-button">
                    <i className="pi pi-calendar"></i>
                    <span>Calendar</span>
                </button>

                <button
                    type="button"
                    className="p-link layout-topbar-button"
                    onClick={(e) => profileOverlayRef.current?.toggle(e)}
                >
                    <i className="pi pi-user"></i>
                    <span>Profile</span>
                </button>

                <Link href="/documentation">
                    <button type="button" className="p-link layout-topbar-button">
                        <i className="pi pi-cog"></i>
                        <span>Settings</span>
                    </button>
                </Link>
            </div>

            <OverlayPanel ref={profileOverlayRef}>
                <div className="p-d-flex p-flex-column p-ai-start">
                    <div className="p-mb-2">
                        <strong>{name}</strong>
                        <div className="text-sm text-500">{role}</div>
                    </div>
                    <Link href="/profile">
                        <Button
                            label="Edit Profile"
                            icon="pi pi-pencil"
                            className="p-button-text p-mb-2"
                        />
                    </Link>
                    <Button
                        label="Logout"
                        icon="pi pi-sign-out"
                        className="p-button-text p-button-danger"
                        onClick={handleLogout}
                    />
                </div>
            </OverlayPanel>
        </div>
    );
});

AppTopbar.displayName = "AppTopbar";

export default AppTopbar;
