import { Axios } from '@/utils/axios';
import { API_ENDPOINTS } from '../api';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async () => {
    try {
        const response = await Axios.get(API_ENDPOINTS.GETALLMESIN);
        // console.log(response.data);
        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Gagal mendapatkan data master mesin' }, { status: 500 });
    }
};

export const POST = async (request: NextRequest) => {
    try {
        const body = await request.json();

        const response = await Axios.post(API_ENDPOINTS.ADDMESIN, body);

        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Gagal Menambahkan data master mesin' }, { status: 500 });
    }
};
