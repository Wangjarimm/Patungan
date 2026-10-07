import { classifyError, SYNC_ERROR_MESSAGES } from './errors';

describe('classifyError', () => {
  it.each([
    [{ message: 'Network request failed' }, 'offline'],
    [{ message: 'TypeError: Failed to fetch' }, 'offline'],
    [{ message: 'x', status: 0 }, 'offline'],
    [{ message: 'Anonymous sign-ins are disabled' }, 'anonymous_disabled'],
    [{ message: 'Service Unavailable', status: 503 }, 'unavailable'],
    [{ message: 'paused', status: 540 }, 'unavailable'],
    [{ message: 'duplicate key', status: 409 }, 'unknown'],
    [null, 'unknown'],
    ['weird', 'unknown'],
  ] as const)('%p -> %s', (error, kind) => {
    expect(classifyError(error)).toBe(kind);
  });

  it('has an Indonesian message for every kind', () => {
    expect(SYNC_ERROR_MESSAGES.offline).toMatch(/offline/i);
    expect(Object.keys(SYNC_ERROR_MESSAGES)).toHaveLength(4);
  });
});
