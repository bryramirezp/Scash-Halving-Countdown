import { getBlockCount, calculateHalvingData } from '../lib/api';
import { BLOCK_REFRESH_INTERVAL, BLOCK_TIME_SECONDS } from '../lib/constants';
import { secureLog } from '../lib/security';

let currentTimeRemaining = 0;
let countdownInterval: number | null = null;
let blockRefreshInterval: number | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const BASE_DELAY = 5000; // 5 segundos

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

async function refreshBlockData() {
  try {
    const currentBlock = await getBlockCount();
    const halvingData = calculateHalvingData(currentBlock);
    currentTimeRemaining = halvingData.timeRemaining;
    
    retryCount = 0;
    
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
  } catch (error) {
    retryCount++;
    if (retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
      secureLog(`Error refreshing block data, retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`, error);
      setTimeout(() => refreshBlockData(), delay);
    } else {
      secureLog('Max retries reached for block data refresh', error);
    }
  }
}

export function initCountdown(initialSeconds: number) {
  currentTimeRemaining = Math.max(0, initialSeconds);
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  updateDisplay(currentTimeRemaining);
  
  countdownInterval = window.setInterval(() => {
    if (currentTimeRemaining > 0) {
      currentTimeRemaining--;
      updateDisplay(currentTimeRemaining);
    } else {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      refreshBlockData();
    }
  }, 1000);
  
  blockRefreshInterval = window.setInterval(() => {
    refreshBlockData().then(() => {
      const currentBlockText = document.getElementById('current-block')?.textContent?.replace(/,/g, '') || '0';
      const currentBlock = parseInt(currentBlockText, 10);
      const halvingData = calculateHalvingData(currentBlock);
      currentTimeRemaining = halvingData.timeRemaining;
    });
  }, BLOCK_REFRESH_INTERVAL);
  
  refreshBlockData();
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

