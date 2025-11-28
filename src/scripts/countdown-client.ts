import { getBlockCount, calculateHalvingData } from '../lib/api';
import { BLOCK_REFRESH_INTERVAL, BLOCK_TIME_SECONDS } from '../lib/constants';
import { secureLog } from '../lib/security';

let targetHalvingTimestamp = 0;
let countdownInterval: number | null = null;
let blockRefreshInterval: number | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const BASE_DELAY = 5000; // 5 segundos

function calculateTimeRemaining(): number {
  if (targetHalvingTimestamp <= 0) {
    return 0;
  }
  const now = Date.now();
  return Math.max(0, Math.floor((targetHalvingTimestamp - now) / 1000));
}

function updateDisplay(seconds: number) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
    seconds = 0;
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  if (daysEl) daysEl.textContent = String(days).padStart(3, '0');
  if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
  if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
  if (secondsEl) secondsEl.textContent = String(secs).padStart(2, '0');
}

async function refreshBlockData(updateHalvingDate: boolean = false) {
  try {
    const currentBlock = await getBlockCount();
    const halvingData = calculateHalvingData(currentBlock);
    
    const currentBlockEl = document.getElementById('current-block');
    const nextHalvingDateEl = document.getElementById('next-halving-date');
    
    if (currentBlockEl) {
      currentBlockEl.textContent = currentBlock.toLocaleString();
    }
    
    if (nextHalvingDateEl) {
      nextHalvingDateEl.textContent = halvingData.nextHalvingDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    }
    
    if (updateHalvingDate) {
      const newHalvingTimestamp = halvingData.nextHalvingDate.getTime();
      if (newHalvingTimestamp !== targetHalvingTimestamp) {
        targetHalvingTimestamp = newHalvingTimestamp;
      }
    }
    
    retryCount = 0;
  } catch (error) {
    retryCount++;
    if (retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
      secureLog(`Error refreshing block data, retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`, error);
      setTimeout(() => refreshBlockData(updateHalvingDate), delay);
    } else {
      secureLog('Max retries reached for block data refresh', error);
    }
  }
}

export function initCountdown(initialSeconds: number, halvingTimestamp: number) {
  cleanup();
  
  targetHalvingTimestamp = halvingTimestamp;
  
  const currentTimeRemaining = calculateTimeRemaining();
  updateDisplay(currentTimeRemaining);
  
  countdownInterval = window.setInterval(() => {
    const timeRemaining = calculateTimeRemaining();
    if (timeRemaining > 0) {
      updateDisplay(timeRemaining);
    } else {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      refreshBlockData(true);
    }
  }, 1000);
  
  blockRefreshInterval = window.setInterval(() => {
    refreshBlockData(true);
  }, BLOCK_REFRESH_INTERVAL);
  
  setTimeout(() => {
    refreshBlockData(false);
  }, 2000);
}

export function cleanup() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (blockRefreshInterval) {
    clearInterval(blockRefreshInterval);
    blockRefreshInterval = null;
  }
}

