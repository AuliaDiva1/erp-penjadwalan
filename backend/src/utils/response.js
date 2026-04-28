export const success = (res, message, data = null, code = 200) => {
  const payload = { 
    success: true, // Gunakan boolean agar mudah dicek if (data.success)
    status: 'success', 
    message 
  };
  if (data !== null) payload.data = data;
  return res.status(code).json(payload);
};

export const error = (res, message, code = 500, errors = null) => {
  const payload = { 
    success: false, // Gunakan boolean
    status: 'error', 
    message 
  };
  if (errors !== null) payload.errors = errors;
  return res.status(code).json(payload);
};