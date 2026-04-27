import React from 'react';
import { Skeleton } from 'primereact/skeleton';

export const FormFieldSkeleton = () => (
    <div className="mb-4">
        <Skeleton width="8rem" height="1.5rem" className="mb-2"></Skeleton>
        <Skeleton width="100%" height="3rem"></Skeleton>
    </div>
);

export const RegisterFormSkeleton = () => (
    <div className="p-fluid">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
    </div>
);

export const RegisterPageSkeleton = () => (
    <div className="min-h-screen flex align-items-center justify-content-center p-4"
         style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        
        <div className="surface-card shadow-8 border-round-2xl overflow-hidden"
             style={{ maxWidth: '900px', width: '100%' }}>
            
            {/* Header Skeleton */}
            <div className="p-5 border-bottom-1 surface-border"
                 style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
                <Skeleton 
                    width="16rem" 
                    height="2.5rem" 
                    className="mb-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                />
                <Skeleton 
                    width="20rem" 
                    height="1.2rem"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                />
            </div>

            {/* Steps Skeleton */}
            <div className="p-5 border-bottom-1 surface-border">
                <div className="flex justify-content-between">
                    <Skeleton shape="circle" size="3rem" className="mr-2"></Skeleton>
                    <Skeleton shape="circle" size="3rem" className="mr-2"></Skeleton>
                    <Skeleton shape="circle" size="3rem" className="mr-2"></Skeleton>
                    <Skeleton shape="circle" size="3rem"></Skeleton>
                </div>
            </div>

            {/* Form Content Skeleton */}
            <div className="p-6">
                <RegisterFormSkeleton />
            </div>

            {/* Footer Skeleton */}
            <div className="p-5 border-top-1 surface-border flex justify-content-between">
                <Skeleton width="8rem" height="3rem"></Skeleton>
                <Skeleton width="10rem" height="3rem"></Skeleton>
            </div>
        </div>
    </div>
);