import { API_BASE, HALVING_INTERVAL, BLOCK_TIME_SECONDS } from './constants';
import { secureLog, validateNumber } from './security';

export interface HalvingData {
  currentBlock: number;
  nextHalvingBlock: number;
  blocksRemaining: number;
  timeRemaining: number; // en segundos
  nextHalvingDate: Date;
}

const FETCH_TIMEOUT = 10000; // 10 segundos

export async function getBlockCount(): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    const response = await fetch(`${API_BASE}/api/getblockcount`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const blockCount = validateNumber(data, 0, Number.MAX_SAFE_INTEGER);
    
    return blockCount;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      secureLog('Error fetching block count: Request timeout');
      throw new Error('Request timeout');
    }
    
    secureLog('Error fetching block count', error);
    throw error;
  }
}

export function calculateHalvingData(currentBlock: number): HalvingData {
  const nextHalvingBlock = Math.ceil(currentBlock / HALVING_INTERVAL) * HALVING_INTERVAL;
  const blocksRemaining = nextHalvingBlock - currentBlock;
  const timeRemaining = blocksRemaining * BLOCK_TIME_SECONDS;
  const nextHalvingDate = new Date(Date.now() + timeRemaining * 1000);
  
  return {
    currentBlock,
    nextHalvingBlock,
    blocksRemaining,
    timeRemaining,
    nextHalvingDate,
  };
}

