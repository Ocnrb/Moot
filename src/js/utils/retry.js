/**
 * Retry Utility
 * Centralized retry logic with exponential backoff
 */

import { Logger } from '../logger.js';
import { CONFIG } from '../config.js';

/**
 * Execute an async function with retry logic and exponential backoff
 * 
 * @param {string} operationName - Name for logging purposes
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {number} [options.maxRetries] - Maximum retry attempts (default: CONFIG.retry.maxAttempts)
 * @param {number} [options.baseDelay] - Base delay in ms (default: CONFIG.retry.baseDelayMs)
 * @param {Function} [options.onAttempt] - Callback on each attempt: (attempt, maxRetries) => void
 * @param {Function} [options.onError] - Callback on error: (error, attempt) => void
 * @param {Function} [options.shouldRetry] - Custom retry condition: (error) => boolean
 * @returns {Promise<any>} - Result of asyncFn
 * @throws {Error} - Last error if all retries fail
 */
export async function executeWithRetry(operationName, asyncFn, options = {}) {
    const {
        maxRetries = CONFIG.retry.maxAttempts,
        baseDelay = CONFIG.retry.baseDelayMs,
        backoffMultiplier = CONFIG.retry.backoffMultiplier,
        onAttempt = null,
        onError = null,
        shouldRetry = () => true
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            Logger.debug(`${operationName} (attempt ${attempt}/${maxRetries})...`);
            
            if (onAttempt) {
                onAttempt(attempt, maxRetries);
            }

            const result = await asyncFn();
            
            if (attempt > 1) {
                Logger.debug(`${operationName} succeeded on attempt ${attempt}`);
            }
            
            return result;

        } catch (error) {
            lastError = error;
            Logger.warn(`${operationName} attempt ${attempt} failed:`, error.message);

            if (onError) {
                onError(error, attempt);
            }

            // Check if we should retry
            if (!shouldRetry(error)) {
                Logger.debug(`${operationName}: not retrying due to error type`);
                throw error;
            }

            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
                Logger.debug(`Retrying ${operationName} in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    Logger.error(`All ${operationName} attempts failed`);
    throw lastError;
}

/**
 * Execute with retry, checking if resource exists after error
 * Useful for blockchain operations where tx may succeed despite error response
 * 
 * @param {string} operationName - Name for logging
 * @param {Function} asyncFn - Async function to execute
 * @param {Function} checkExistsFn - Function to check if resource was created despite error
 * @param {Object} options - Retry options (same as executeWithRetry)
 * @returns {Promise<any>} - Result of asyncFn or checkExistsFn
 */
export async function executeWithRetryAndVerify(operationName, asyncFn, checkExistsFn, options = {}) {
    const {
        maxRetries = CONFIG.retry.maxAttempts,
        baseDelay = CONFIG.retry.baseDelayMs,
        backoffMultiplier = CONFIG.retry.backoffMultiplier
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            Logger.debug(`${operationName} (attempt ${attempt}/${maxRetries})...`);
            return await asyncFn();

        } catch (error) {
            lastError = error;
            Logger.warn(`${operationName} attempt ${attempt} failed:`, error.message);

            // Check if operation actually succeeded despite error
            try {
                const existing = await checkExistsFn();
                if (existing) {
                    Logger.info(`${operationName}: resource exists despite error`);
                    return existing;
                }
            } catch (checkError) {
                // Resource doesn't exist, continue retry
            }

            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
                Logger.debug(`Retrying ${operationName} in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    Logger.error(`All ${operationName} attempts failed`);
    throw lastError;
}

// ── Circuit Breaker ──────────────────────────────────────────────

/** @type {Map<string, { failures: number, lastFailure: number, state: 'closed'|'open'|'half-open' }>} */
const circuits = new Map();

/**
 * Simple circuit breaker for recurring operations (periodic refresh, polling).
 * - CLOSED (normal): operations execute normally, failures increment counter
 * - OPEN (tripped): operations are skipped entirely for `resetTimeoutMs`
 * - HALF-OPEN: one probe call allowed; success closes circuit, failure re-opens
 *
 * @param {string} name - Unique circuit name (e.g. 'relay-refresh')
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} [opts]
 * @param {number} [opts.threshold=5] - Consecutive failures to trip
 * @param {number} [opts.resetTimeoutMs=60000] - Cooldown before half-open probe
 * @returns {Promise<any>} - Result of asyncFn, or undefined if circuit is open
 */
export async function withCircuitBreaker(name, asyncFn, opts = {}) {
    const { threshold = 5, resetTimeoutMs = 60000 } = opts;

    if (!circuits.has(name)) {
        circuits.set(name, { failures: 0, lastFailure: 0, state: 'closed' });
    }

    const circuit = circuits.get(name);

    // OPEN → check if cooldown expired
    if (circuit.state === 'open') {
        if (Date.now() - circuit.lastFailure < resetTimeoutMs) {
            Logger.debug(`Circuit breaker [${name}]: OPEN — skipping`);
            return undefined;
        }
        // Cooldown expired → allow one probe
        circuit.state = 'half-open';
        Logger.debug(`Circuit breaker [${name}]: HALF-OPEN — probing`);
    }

    try {
        const result = await asyncFn();
        // Success → close circuit
        if (circuit.state !== 'closed') {
            Logger.info(`Circuit breaker [${name}]: recovered → CLOSED`);
        }
        circuit.failures = 0;
        circuit.state = 'closed';
        return result;
    } catch (error) {
        circuit.failures++;
        circuit.lastFailure = Date.now();

        if (circuit.state === 'half-open' || circuit.failures >= threshold) {
            circuit.state = 'open';
            Logger.warn(`Circuit breaker [${name}]: OPEN after ${circuit.failures} failures (cooldown ${resetTimeoutMs / 1000}s)`);
        }
        throw error;
    }
}

/**
 * Reset a named circuit (e.g. when user reconnects).
 * @param {string} name
 */
export function resetCircuit(name) {
    circuits.delete(name);
}

/**
 * Get current state of a named circuit (for testing/diagnostics).
 * @param {string} name
 * @returns {{ failures: number, state: string } | undefined}
 */
export function getCircuitState(name) {
    return circuits.get(name);
}
