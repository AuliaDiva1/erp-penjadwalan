import { Axios } from '@/utils/axios';
import { API_ENDPOINTS } from '../api';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async () => {
    try {
        const response = await Axios.get(API_ENDPOINTS.GETALLUSERS);

        return NextResponse.json({ data: response.data });
    } catch (err) {
        return NextResponse.json({ message: 'Failed to fetch mesin data' }, { status: 500 });
    }
};
