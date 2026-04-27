import { API_ENDPOINTS } from '@/app/api/api';
import { Axios } from '@/utils/axios';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async () => {
    try {
        const response = await Axios.get(API_ENDPOINTS.GETALLMONITORSUHU);

        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Failed to fetch data' }, { status: 500 });
    }
};

export const POST = async (request: NextRequest) => {
    try {
        const body = await request.json();

        const response = await Axios.post(API_ENDPOINTS.ADDMONITORSUHU, body);

        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Failed to post data' }, { status: 500 });
    }
};
