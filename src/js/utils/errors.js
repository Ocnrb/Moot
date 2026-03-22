/**
 * Error Infrastructure Module
 * Defines the Pombo error hierarchy and Result type for production-grade error handling.
 *
 * Error Contract:
 * ─────────────────────────────────────────────────────────────────
 * Layer              │ Pattern
 * ─────────────────────────────────────────────────────────────────
 * Infra / Crypto     │ throw PomboError subclass (always)
 * Data mutations     │ throw PomboError subclass (always)
 * Data queries       │ return Result<T> for critical, null+log for optional
 * Event handlers     │ catch + log (never propagate)
 * Push / Relay       │ return boolean (fire-and-forget)
 * ─────────────────────────────────────────────────────────────────
 */

// ── Error Hierarchy ──────────────────────────────────────────────

/**
 * Base error for all Pombo application errors.
 * Always carries a `code` for programmatic handling.
 */
export class PomboError extends Error {
    /**
     * @param {string} message - Human-readable description
     * @param {string} code - Machine-readable code (e.g. 'STORAGE_DECRYPT_FAILED')
     * @param {Object} [options]
     * @param {Error}  [options.cause] - Original error (standard ES2022 cause)
     */
    constructor(message, code, options = {}) {
        super(message, { cause: options.cause });
        this.name = 'PomboError';
        this.code = code;
    }
}

/** Storage encryption/decryption or persistence failures */
export class StorageError extends PomboError {
    constructor(message, code = 'STORAGE_ERROR', options = {}) {
        super(message, code, options);
        this.name = 'StorageError';
    }
}

/** Cryptographic operation failures (ECDH, AES, PBKDF2, etc.) */
export class CryptoError extends PomboError {
    constructor(message, code = 'CRYPTO_ERROR', options = {}) {
        super(message, code, options);
        this.name = 'CryptoError';
    }
}

/** Network / RPC / API failures */
export class NetworkError extends PomboError {
    constructor(message, code = 'NETWORK_ERROR', options = {}) {
        super(message, code, options);
        this.name = 'NetworkError';
    }
}

/** Input validation or data integrity failures */
export class ValidationError extends PomboError {
    constructor(message, code = 'VALIDATION_ERROR', options = {}) {
        super(message, code, options);
        this.name = 'ValidationError';
    }
}

// ── Result Type ──────────────────────────────────────────────────

/**
 * Lightweight Result type for queries that can fail gracefully.
 * Use instead of returning null when callers need to distinguish
 * "no data" from "operation failed".
 *
 * @template T
 * @typedef {{ ok: true, data: T }} ResultOk
 * @typedef {{ ok: false, error: PomboError }} ResultErr
 * @typedef {ResultOk<T> | ResultErr} Result
 */

/**
 * Create a success result.
 * @template T
 * @param {T} data
 * @returns {ResultOk<T>}
 */
export function Ok(data) {
    return { ok: true, data };
}

/**
 * Create a failure result.
 * @param {PomboError|Error|string} error
 * @returns {ResultErr}
 */
export function Err(error) {
    if (typeof error === 'string') {
        return { ok: false, error: new PomboError(error, 'UNKNOWN_ERROR') };
    }
    return { ok: false, error };
}
