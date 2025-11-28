import { HALVING_INTERVAL, BLOCK_TIME_SECONDS } from './constants';
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
    const apiUrl = typeof window === 'undefined'
      ? 'https://scash.tv/api/getblockcount'
      : '/api/getblockcount';
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;
      secureLog(`Error fetching block count: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const text = await response.text();
      secureLog(`Error parsing JSON response. Response text: ${text.substring(0, 100)}`, jsonError);
      throw new Error('Invalid JSON response from API');
    }
    
    const blockCount = validateNumber(data, 0, Number.MAX_SAFE_INTEGER);
    
    return blockCount;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        secureLog('Error fetching block count: Request timeout');
        throw new Error('Request timeout');
      }
      
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('failed to fetch') || 
          errorMsg.includes('networkerror') ||
          errorMsg.includes('network request failed') ||
          errorMsg.includes('cors')) {
        secureLog('Error fetching block count: Network/CORS error - unable to connect to API', error);
        throw new Error('Network error: Unable to connect to API. Please check CORS settings.');
      }
      
      if (errorMsg.includes('json')) {
        throw error;
      }
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

