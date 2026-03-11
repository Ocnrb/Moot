/**
 * DM Crypto Module
 * End-to-end encryption for DMs using ECDH (secp256k1) + AES-256-GCM.
 *
 * How it works:
 * - Each user's public key is stored in their DM inbox stream metadata.
 * - ECDH between sender's private key and receiver's public key produces a shared secret.
 * - Shared secret is passed through HKDF to derive an AES-256-GCM key.
 * - Messages are encrypted/decrypted at the app layer; Streamr transports only ciphertext.
 *
 * Security:
 * - Even if someone subscribes to the stream, they see only ciphertext.
 * - ECDH is deterministic: both peers derive the same shared key independently.
 * - Fresh random IV per message prevents nonce reuse.
 */

import { Logger } from './logger.js';

class DMCrypto {
    constructor() {
        // Cache: peerAddress (lowercase) → CryptoKey (AES-256-GCM)
        this.sharedKeys = new Map();
        // Cache: peerAddress (lowercase) → compressedPublicKey hex
        this.peerPublicKeys = new Map();
    }

    /**
     * Get my compressed public key from wallet private key.
     * @param {string} privateKeyHex - Wallet private key (hex, with 0x prefix)
     * @returns {string} - Compressed public key (hex, 33 bytes)
     */
    getMyPublicKey(privateKeyHex) {
        const signingKey = new ethers.SigningKey(privateKeyHex);
        return signingKey.compressedPublicKey;
    }

    /**
     * Derive the AES-256-GCM shared key for a specific peer.
     * Uses ECDH + HKDF.
     * @param {string} myPrivateKeyHex - My private key (hex, with 0x prefix)
     * @param {string} peerPublicKeyHex - Peer's compressed public key (hex, 33 bytes)
     * @returns {Promise<CryptoKey>} - AES-256-GCM key
     */
    async deriveSharedKey(myPrivateKeyHex, peerPublicKeyHex) {
        // ECDH: compute raw shared secret (32 bytes)
        const signingKey = new ethers.SigningKey(myPrivateKeyHex);
        const sharedSecretHex = signingKey.computeSharedSecret(peerPublicKeyHex);
        // sharedSecretHex is 0x-prefixed, 65 bytes (uncompressed point). Take x-coordinate (bytes 1-32).
        const sharedBytes = ethers.getBytes(sharedSecretHex).slice(1, 33);

        // HKDF: derive 256-bit AES key from shared secret
        const keyMaterial = await crypto.subtle.importKey(
            'raw', sharedBytes, { name: 'HKDF' }, false, ['deriveKey']
        );

        const aesKey = await crypto.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: new TextEncoder().encode('pombo-dm-e2e-v1'),
                info: new TextEncoder().encode('aes-256-gcm')
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        return aesKey;
    }

    /**
     * Get or derive the shared key for a peer (with caching).
     * @param {string} myPrivateKeyHex - My private key
     * @param {string} peerAddress - Peer's Ethereum address (for cache lookup)
     * @param {string} peerPublicKeyHex - Peer's compressed public key
     * @returns {Promise<CryptoKey>}
     */
    async getSharedKey(myPrivateKeyHex, peerAddress, peerPublicKeyHex) {
        const normalized = peerAddress.toLowerCase();

        if (this.sharedKeys.has(normalized)) {
            return this.sharedKeys.get(normalized);
        }

        const key = await this.deriveSharedKey(myPrivateKeyHex, peerPublicKeyHex);
        this.sharedKeys.set(normalized, key);
        return key;
    }

    /**
     * Encrypt a message object for DM transport.
     * @param {Object} message - Plaintext message object
     * @param {CryptoKey} aesKey - AES-256-GCM key
     * @returns {Promise<Object>} - { ct: base64, iv: base64, e: 'aes-256-gcm' }
     */
    async encrypt(message, aesKey) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const plaintext = new TextEncoder().encode(JSON.stringify(message));

        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            plaintext
        );

        return {
            ct: this.bufToBase64(ciphertext),
            iv: this.bufToBase64(iv),
            e: 'aes-256-gcm'
        };
    }

    /**
     * Decrypt a DM envelope back to the original message object.
     * @param {Object} envelope - { ct, iv, e }
     * @param {CryptoKey} aesKey - AES-256-GCM key
     * @returns {Promise<Object>} - Decrypted message object
     */
    async decrypt(envelope, aesKey) {
        if (envelope.e !== 'aes-256-gcm') {
            throw new Error(`Unknown DM encryption: ${envelope.e}`);
        }

        const ciphertext = this.base64ToBuf(envelope.ct);
        const iv = this.base64ToBuf(envelope.iv);

        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            ciphertext
        );

        return JSON.parse(new TextDecoder().decode(plaintext));
    }

    /**
     * Check if a data object is an encrypted DM envelope.
     * @param {Object} data - Raw data from Streamr
     * @returns {boolean}
     */
    isEncrypted(data) {
        return !!(data && typeof data.ct === 'string' && typeof data.iv === 'string' && data.e === 'aes-256-gcm');
    }

    /**
     * Clear all cached keys (on disconnect/logout).
     */
    clear() {
        this.sharedKeys.clear();
        this.peerPublicKeys.clear();
    }

    // -- Helpers --

    bufToBase64(buf) {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToBuf(b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const dmCrypto = new DMCrypto();
