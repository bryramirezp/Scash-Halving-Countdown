export const HALVING_INTERVAL = 210000;
export const BLOCK_TIME_SECONDS = 600; // 10 minutos (igual que Bitcoin)

// Genesis block date: 2/23/2024, 1:07:36 AM UTC
export const GENESIS_BLOCK_DATE = new Date('2024-02-23T01:07:36Z');

const API_BASE_RAW = 'https://scash.tv';

export const API_BASE = import.meta.env.PROD 
  ? API_BASE_RAW.replace(/^http:/, 'https:')
  : API_BASE_RAW;

export const BLOCK_REFRESH_INTERVAL = 1 * 60 * 1000; // 1 minuto en milisegundos

export function calculateHalvingDate(halvingBlockNumber: number): Date {
  const blocksFromGenesis = halvingBlockNumber;
  const millisecondsFromGenesis = blocksFromGenesis * BLOCK_TIME_SECONDS * 1000;
  return new Date(GENESIS_BLOCK_DATE.getTime() + millisecondsFromGenesis);
}

export function getFirstHalvingDate(): Date {
  return calculateHalvingDate(HALVING_INTERVAL);
}

