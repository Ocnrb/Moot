/**
 * Chain Errors Module Tests
 * Tests for blockchain error parsing
 */

import { describe, it, expect } from 'vitest';
import { parseChainError, isRetryableError, getErrorMessage } from '../../src/js/utils/chainErrors.js';

describe('chainErrors', () => {
    describe('parseChainError', () => {
        describe('INSUFFICIENT_FUNDS detection', () => {
            it('should detect INSUFFICIENT_FUNDS code', () => {
                const error = { code: 'INSUFFICIENT_FUNDS', message: 'some error' };
                const result = parseChainError(error);
                expect(result.type).toBe('INSUFFICIENT_FUNDS');
                expect(result.isGasError).toBe(true);
            });

            it('should detect "insufficient funds" in message', () => {
                const error = { message: 'sender does not have insufficient funds for gas' };
                const result = parseChainError(error);
                expect(result.type).toBe('INSUFFICIENT_FUNDS');
            });

            it('should detect "balance too low"', () => {
                const error = { message: 'balance too low to execute transaction' };
                const result = parseChainError(error);
                expect(result.type).toBe('INSUFFICIENT_FUNDS');
            });
        });

        describe('CALL_EXCEPTION detection', () => {
            it('should detect CALL_EXCEPTION code', () => {
                const error = { code: 'CALL_EXCEPTION', message: '' };
                const result = parseChainError(error);
                expect(result.type).toBe('CALL_EXCEPTION');
                expect(result.isGasError).toBe(true);
            });

            it('should detect "execution reverted"', () => {
                const error = { message: 'execution reverted' };
                const result = parseChainError(error);
                expect(result.type).toBe('CALL_EXCEPTION');
            });

            it('should detect "transaction reverted"', () => {
                const error = { message: 'transaction reverted without a reason' };
                const result = parseChainError(error);
                expect(result.type).toBe('CALL_EXCEPTION');
            });
        });

        describe('NETWORK_ERROR detection', () => {
            it('should detect NETWORK_ERROR code', () => {
                const error = { code: 'NETWORK_ERROR', message: '' };
                const result = parseChainError(error);
                expect(result.type).toBe('NETWORK_ERROR');
                expect(result.isGasError).toBe(false);
            });

            it('should detect timeout errors', () => {
                const error = { message: 'Request timeout after 30000ms' };
                const result = parseChainError(error);
                expect(result.type).toBe('NETWORK_ERROR');
            });

            it('should detect ECONNREFUSED', () => {
                const error = { message: 'connect ECONNREFUSED 127.0.0.1:8545' };
                const result = parseChainError(error);
                expect(result.type).toBe('NETWORK_ERROR');
            });

            it('should detect SERVER_ERROR', () => {
                const error = { code: 'SERVER_ERROR', message: 'Internal JSON-RPC error' };
                const result = parseChainError(error);
                expect(result.type).toBe('NETWORK_ERROR');
            });
        });

        describe('USER_REJECTED detection', () => {
            it('should detect ACTION_REJECTED code', () => {
                const error = { code: 'ACTION_REJECTED', message: '' };
                const result = parseChainError(error);
                expect(result.type).toBe('USER_REJECTED');
                expect(result.isGasError).toBe(false);
            });

            it('should detect "user rejected"', () => {
                const error = { message: 'User rejected the request' };
                const result = parseChainError(error);
                expect(result.type).toBe('USER_REJECTED');
            });

            it('should detect MetaMask code 4001', () => {
                const error = { message: 'MetaMask error code: 4001' };
                const result = parseChainError(error);
                expect(result.type).toBe('USER_REJECTED');
            });

            it('should detect numeric code 4001', () => {
                const error = { code: 4001, message: 'User denied' };
                const result = parseChainError(error);
                expect(result.type).toBe('USER_REJECTED');
            });
        });

        describe('NONCE_ERROR detection', () => {
            it('should detect "nonce too low"', () => {
                const error = { message: 'nonce too low' };
                const result = parseChainError(error);
                expect(result.type).toBe('NONCE_ERROR');
            });

            it('should detect "nonce too high"', () => {
                const error = { message: 'nonce too high' };
                const result = parseChainError(error);
                expect(result.type).toBe('NONCE_ERROR');
            });

            it('should detect REPLACEMENT_UNDERPRICED', () => {
                const error = { code: 'REPLACEMENT_UNDERPRICED', message: '' };
                const result = parseChainError(error);
                expect(result.type).toBe('NONCE_ERROR');
            });
        });

        describe('GAS_LIMIT detection', () => {
            it('should detect "out of gas"', () => {
                const error = { message: 'out of gas' };
                const result = parseChainError(error);
                expect(result.type).toBe('GAS_LIMIT');
                expect(result.isGasError).toBe(true);
            });

            it('should detect "intrinsic gas too low"', () => {
                const error = { message: 'intrinsic gas too low' };
                const result = parseChainError(error);
                expect(result.type).toBe('GAS_LIMIT');
            });
        });

        describe('UNKNOWN error handling', () => {
            it('should return UNKNOWN for unrecognized errors', () => {
                const error = { message: 'Something completely unexpected' };
                const result = parseChainError(error);
                expect(result.type).toBe('UNKNOWN');
                expect(result.isGasError).toBe(false);
            });

            it('should preserve original message for unknown errors', () => {
                const error = { message: 'Custom error message' };
                const result = parseChainError(error);
                expect(result.message).toBe('Custom error message');
            });

            it('should handle empty error object', () => {
                const error = {};
                const result = parseChainError(error);
                expect(result.type).toBe('UNKNOWN');
            });
        });

        describe('nested error parsing', () => {
            it('should check error.reason', () => {
                const error = { message: '', reason: 'INSUFFICIENT_FUNDS' };
                const result = parseChainError(error);
                expect(result.type).toBe('INSUFFICIENT_FUNDS');
            });

            it('should check error.data.message', () => {
                const error = { message: '', data: { message: 'execution reverted' } };
                const result = parseChainError(error);
                expect(result.type).toBe('CALL_EXCEPTION');
            });

            it('should check nested error object', () => {
                const error = { message: '', error: { code: 'NETWORK_ERROR' } };
                const result = parseChainError(error);
                expect(result.type).toBe('NETWORK_ERROR');
            });
        });
    });

    describe('isRetryableError', () => {
        it('should return true for NETWORK_ERROR', () => {
            const error = { code: 'NETWORK_ERROR', message: '' };
            expect(isRetryableError(error)).toBe(true);
        });

        it('should return true for NONCE_ERROR', () => {
            const error = { message: 'nonce too low' };
            expect(isRetryableError(error)).toBe(true);
        });

        it('should return false for USER_REJECTED', () => {
            const error = { code: 'ACTION_REJECTED', message: '' };
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for INSUFFICIENT_FUNDS', () => {
            const error = { code: 'INSUFFICIENT_FUNDS', message: '' };
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for UNKNOWN', () => {
            const error = { message: 'random error' };
            expect(isRetryableError(error)).toBe(false);
        });
    });

    describe('getErrorMessage', () => {
        it('should return user-friendly message for known errors', () => {
            const error = { code: 'INSUFFICIENT_FUNDS', message: '' };
            const message = getErrorMessage(error);
            expect(message).toContain('POL');
        });

        it('should return original message for unknown errors', () => {
            const error = { message: 'Custom error text' };
            const message = getErrorMessage(error);
            expect(message).toBe('Custom error text');
        });
    });
});
