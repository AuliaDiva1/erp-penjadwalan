export const API_URL = process.env.API_URL;

export const API_ENDPOINTS = {
    GETALLUSERS: `${API_URL}/user`,

    GETALLMESIN: `${API_URL}/master-mesin`,
    GETMESINBYID: (id: number) => `${API_URL}/master-mesin/${id}`,
    ADDMESIN: `${API_URL}/master-mesin/create`,
    EDITMESIN: (id: number) => `${API_URL}/master-mesin/edit/${id}`,
    DELETEMESIN: (id: number) => `${API_URL}/master-mesin/delete/${id}`,

    GETALLMONITORSUHU: `${API_URL}/monitor-suhu`,
    IMPORTEXCEL: `${API_URL}/monitor-suhu/import`,
    GETMONITORSUHUBYID: (id: number) => `${API_URL}/monitor-suhu/${id}`,
    ADDMONITORSUHU: `${API_URL}/monitor-suhu/create`,
    EDITMONITORSUHU: (id: number) => `${API_URL}/monitor-suhu/edit/${id}`,
    DELETEMONITORSUHU: (id: number) => `${API_URL}/monitor-suhu/delete/${id}`
};
