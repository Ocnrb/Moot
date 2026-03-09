/**
 * Retry Utility Tests
 * Tests for retry logic with exponential backoff
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWithRetry, executeWithRetryAndVerify } from '../../src/js/utils/retry.js';

describe('retry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('executeWithRetry', () => {
        it('should return result on first successful attempt', async () => {
            const asyncFn = vi.fn().mockResolvedValue('success');
            
            const result = await executeWithRetry('test', asyncFn, { maxRetries: 3 });
            
            expect(result).toBe('success');
            expect(asyncFn).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure', async () => {
            const asyncFn = vi.fn()
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockResolvedValue('success');
            
            const result = await executeWithRetry('test', asyncFn, { 
                maxRetries: 3, 
                baseDelay: 10 
            });
            
            expect(result).toBe('success');
            expect(asyncFn).toHaveBeenCalledTimes(2);
        });

        it('should throw after all retries exhausted', async () => {
            const error = new Error('persistent failure');
            const asyncFn = vi.fn().mockRejectedValue(error);
            
            await expect(executeWithRetry('test', asyncFn, { 
                maxRetries: 3, 
                baseDelay: 10 
            })).rejects.toThrow('persistent failure');
            
            expect(asyncFn).toHaveBeenCalledTimes(3);
        });

        it('should call onAttempt callback', async () => {
            const asyncFn = vi.fn().mockResolvedValue('ok');
            const onAttempt = vi.fn();
            
            await executeWithRetry('test', asyncFn, { 
                maxRetries: 3,
                onAttempt 
            });
            
            expect(onAttempt).toHaveBeenCalledWith(1, 3);
        });

        it('should call onError callback on failure', async () => {
            const error = new Error('fail');
            const asyncFn = vi.fn()
                .mockRejectedValueOnce(error)
                .mockResolvedValue('ok');
            const onError = vi.fn();
            
            await executeWithRetry('test', asyncFn, { 
                maxRetries: 3, 
                baseDelay: 10,
                onError 
            });
            
            expect(onError).toHaveBeenCalledWith(error, 1);
        });

        it('should respect shouldRetry predicate', async () => {
            const nonRetryableError = new Error('do not retry');
            const asyncFn = vi.fn().mockRejectedValue(nonRetryableError);
            const shouldRetry = vi.fn().mockReturnValue(false);
            
            await expect(executeWithRetry('test', asyncFn, { 
                maxRetries: 5, 
                shouldRetry 
            })).rejects.toThrow('do not retry');
            
            // Should only attempt once since shouldRetry returns false
            expect(asyncFn).toHaveBeenCalledTimes(1);
            expect(shouldRetry).toHaveBeenCalledWith(nonRetryableError);
        });

        it('should use exponential backoff', async () => {
            const asyncFn = vi.fn()
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockRejectedValueOnce(new Error('fail 2'))
                .mockResolvedValue('success');
            
            const start = Date.now();
            
            await executeWithRetry('test', asyncFn, { 
                maxRetries: 3, 
                baseDelay: 50 
            });
            
            const elapsed = Date.now() - start;
            // First retry: 1 * 50 = 50ms, Second retry would be 2 * 50 = 100ms
            // But second succeeds, so total ~50ms minimum
            expect(elapsed).toBeGreaterThanOrEqual(40);
        });
    });

    describe('executeWithRetryAndVerify', () => {
        it('should return result on first successful attempt', async () => {
            const asyncFn = vi.fn().mockResolvedValue('success');
            const checkExistsFn = vi.fn();
            
            const result = await executeWithRetryAndVerify('test', asyncFn, checkExistsFn, { 
                maxRetries: 3 
            });
            
            expect(result).toBe('success');
            expect(asyncFn).toHaveBeenCalledTimes(1);
            expect(checkExistsFn).not.toHaveBeenCalled();
        });

        it('should check if resource exists after error', async () => {
            const asyncFn = vi.fn().mockRejectedValue(new Error('tx error'));
            const checkExistsFn = vi.fn().mockResolvedValue({ id: '123' });
            
            const result = await executeWithRetryAndVerify('test', asyncFn, checkExistsFn, { 
                maxRetries: 3, 
                baseDelay: 10 
            });
            
            expect(result).toEqual({ id: '123' });
            expect(checkExistsFn).toHaveBeenCalled();
        });

        it('should continue retrying if checkExists returns falsy', async () => {
            const asyncFn = vi.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('success');
            const checkExistsFn = vi.fn().mockResolvedValue(null);
            
            const result = await executeWithRetryAndVerify('test', asyncFn, checkExistsFn, { 
                maxRetries: 3, 
                baseDelay: 10 
            });
            
            expect(result).toBe('success');
            expect(asyncFn).toHaveBeenCalledTimes(2);
        });

        it('should continue retrying if checkExists throws', async () => {
            const asyncFn = vi.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('success');
            const checkExistsFn = vi.fn().mockRejectedValue(new Error('check failed'));
            
            const result = await executeWithRetryAndVerify('test', asyncFn, checkExistsFn, { 
                maxRetries: 3, 
                baseDelay: 10 
            });
            
            expect(result).toBe('success');
        });

        it('should throw after all retries if resource never exists', async () => {
            const asyncFn = vi.fn().mockRejectedValue(new Error('persistent error'));
            const checkExistsFn = vi.fn().mockResolvedValue(null);
            
            await expect(executeWithRetryAndVerify('test', asyncFn, checkExistsFn, { 
                maxRetries: 2, 
                baseDelay: 10 
            })).rejects.toThrow('persistent error');
            
            expect(asyncFn).toHaveBeenCalledTimes(2);
            expect(checkExistsFn).toHaveBeenCalledTimes(2);
        });
    });
});
