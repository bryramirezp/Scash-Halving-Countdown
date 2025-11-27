export const HALVING_INTERVAL = 210000;
export const BLOCK_TIME_SECONDS = 600; // 10 minutos (igual que Bitcoin)

const API_BASE_RAW = 'https://scash.tv';

export const API_BASE = import.meta.env.PROD 
  ? API_BASE_RAW.replace(/^http:/, 'https:')
  : API_BASE_RAW;

export const BLOCK_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos en milisegundos

