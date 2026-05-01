import { insertLog } from '../models/activityLogModel.js';

const ACTION_MAP = {
  GET:    'READ',
  POST:   'CREATE',
  PUT:    'UPDATE',
  PATCH:  'UPDATE',
  DELETE: 'DELETE',
};

const MODULE_MAP = {
  '/api/users':        'USERS',
  '/api/materials':    'MATERIALS',
  '/api/machines':     'MACHINES',
  '/api/satuan':       'SATUAN',
  '/api/jobs':         'JOBS',
  '/api/schedules':    'SCHEDULES',
  '/api/procurements': 'PROCUREMENTS',
  '/api/auth':         'AUTH',
  '/api/dashboard':    'DASHBOARD',
  '/api/pipeline':     'PIPELINE',
  '/api/konfigurasi':  'KONFIGURASI',
};

const getModule = (path) => {
  for (const key of Object.keys(MODULE_MAP)) {
    if (path.startsWith(key)) return MODULE_MAP[key];
  }
  return 'SYSTEM';
};

const getDescription = (method, path, user) => {
  const name = user?.full_name || user?.username || 'Unknown';
  const mod  = getModule(path);

  if (path.includes('/auth/login'))  return `${name} melakukan login`;
  if (path.includes('/auth/logout')) return `${name} melakukan logout`;

  const actionMap = {
    GET:    `${name} melihat data ${mod}`,
    POST:   `${name} menambah data ${mod}`,
    PUT:    `${name} mengedit data ${mod}`,
    PATCH:  `${name} memperbarui data ${mod}`,
    DELETE: `${name} menghapus data ${mod}`,
  };

  return actionMap[method] || `${name} mengakses ${mod}`;
};

export const activityLogger = (req, res, next) => {
  const skipPaths = ['/api/dashboard', '/api/activity-logs'];
  const shouldSkip = skipPaths.some(p => req.path.startsWith(p));

  if (shouldSkip || req.method === 'GET') {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = async (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      await insertLog({
        user_id:     req.user.userId || req.user.id,
        action:      ACTION_MAP[req.method] || req.method,
        module:      getModule(req.path),
        description: getDescription(req.method, req.path, req.user),
        ip_address:  req.ip,
      });
    }
    return originalJson(data);
  };

  next();
};