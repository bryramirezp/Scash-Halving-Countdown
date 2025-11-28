export function secureLog(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  } else {
    console.error(message);
    if (error instanceof Error) {
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      if (error.cause) {
        console.error('Error cause:', error.cause);
      }
    } else if (error) {
      console.error('Error details:', String(error));
    }
  }
}

export function validateNumber(value: unknown, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error('Invalid response format: expected number or string');
  }
  
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`Invalid value: must be between ${min} and ${max}`);
  }
  
  return num;
}

