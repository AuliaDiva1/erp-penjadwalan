import { Axios } from '@/utils/axios';
import { API_ENDPOINTS } from '@/app/api/api';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async ({ params }: { params: { id: number } }) => {
    try {
        const response = await Axios.get(API_ENDPOINTS.GETMESINBYID(params.id));

        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Gagal mendapatkan data master mesin dari id yang diberikan' }, { status: 500 });
    }
};

export const PUT = async (request: NextRequest, { params }: { params: { id: number } }) => {
    try {
        const body = await request.json();
        const response = await Axios.put(API_ENDPOINTS.EDITMESIN(params.id), body);

        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Gagal mengupdate data master mesin' }, { status: 500 });
    }
};

export const DELETE = async ({ params }: { params: { id: number } }) => {
    try {
        // console.log(params.id);
        const response = await Axios.delete(API_ENDPOINTS.DELETEMESIN(params.id));

        return NextResponse.json({ data: response.data });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: 'Gagal menghapus data master' }, { status: 500 });
    }
};
