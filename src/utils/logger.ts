type Level = 'info' | 'warn' | 'error' | 'debug';

const log = (level: Level, message: string, meta?: any) => {
  const payload = { level, message, meta, timestamp: new Date().toISOString() };
  if (level === 'error') console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
};

export default {
  info: (msg: string, meta?: any) => log('info', msg, meta),
  warn: (msg: string, meta?: any) => log('warn', msg, meta),
  error: (msg: string, meta?: any) => log('error', msg, meta),
  debug: (msg: string, meta?: any) => log('debug', msg, meta)
};
