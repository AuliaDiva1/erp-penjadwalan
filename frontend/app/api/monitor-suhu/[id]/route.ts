import { API_ENDPOINTS } from '@/app/api/api';
import { Axios } from '@/utils/axios';
import { NextRequest, NextResponse } from 'next/server';

export const PUT = async (request: NextRequest, { params }: { params: { id: number } }) => {
    try {
        const body = await request.json();
        const response = await Axios.put(API_ENDPOINTS.EDITMONITORSUHU(params.id), body);

        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Gagal mengupdate data monitor suhu' }, { status: 500 });
    }
};

export const DELETE = async ({ params }: { params: { id: number } }) => {
    try {
        const response = await Axios.delete(API_ENDPOINTS.DELETEMONITORSUHU(params.id));

        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Gagal menghapus data master' });
    }
};
