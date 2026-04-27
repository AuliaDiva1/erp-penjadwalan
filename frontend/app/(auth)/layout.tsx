import { Metadata } from 'next';
import React from 'react';

interface SimpleLayoutProps {
    children: React.ReactNode;
}

export const metadata: Metadata = {
    title: 'Auth | ERP',
    description: 'Silahkan login terlebih dahulu'
};

export default function SimpleLayout({ children }: SimpleLayoutProps) {
    return <React.Fragment>{children}</React.Fragment>;
}
