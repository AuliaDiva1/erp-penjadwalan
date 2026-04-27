import axios from 'axios';
import { API_URL } from '@/app/api/api';

export const Axios = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});
