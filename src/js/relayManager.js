// relayManager.js - Relay Manager for Push Notifications
// ===========================================================
// Manages Service Worker, Web Push subscriptions, and
// communication with Pombo push notification relays.
// ===========================================================

import { Logger } from './logger.js';
import { streamrController } from './streamr.js';
import { 
    calculateTag,
    calculateChannelTag,
    createRegistrationPayload,
    createNotificationPayload,
    createChannelNotificationPayload,
    DEFAULT_CONFIG 
} from './pushProtocol.js';

// ================================================
// CONFIGURATION
// ================================================

const CONFIG = {
    // Push notifications stream
    pushStreamId: DEFAULT_CONFIG.pushStreamId,
    
    // PoW difficulty
    powDifficulty: DEFAULT_CONFIG.powDifficulty,
    
    // Known relays
    relays: DEFAULT_CONFIG.relays,
    
    // Storage key for state persistence
    storageKey: 'pombo_push_registration',
    
    // Re-registration interval (6 hours) to refresh tokens before expiry
    reRegistrationInterval: 6 * 60 * 60 * 1000
};

// ================================================
// RELAY MANAGER CLASS
// ================================================

class RelayManager {
    constructor() {
        this.initialized = false;
        this.swRegistration = null;
        this.pushSubscription = null;
        this.myTag = null;
        this.enabled = false;
        this.subscribedChannels = new Set(); // Channels with active notifications (opt-in)
        this.reRegistrationTimer = null; // Timer for periodic re-registration
        
        // Listener for Service Worker messages
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });
        }
    }
    
    // ================================================
    // INITIALIZATION
    // ================================================
    
    /**
     * Initialize the push notifications system.
     * Must be called after wallet is available.
     * 
     * @param {string} walletAddress - User's Ethereum address
     * @returns {Promise<boolean>} - true if initialization successful
     */
    async init(walletAddress) {
        // Calcular tag para este endereço
        const newTag = calculateTag(walletAddress);
        Logger.debug('Tag calculated for', walletAddress, '→', newTag);
        
        // If already initialized with SAME address, skip
        if (this.initialized && this.myTag === newTag) {
            Logger.debug('Already initialized with same address');
            return true;
        }
        
        // If initialized with DIFFERENT address, re-register
        if (this.initialized && this.myTag !== newTag) {
            Logger.info('Account changed, re-registering push with new tag:', newTag);
            this.myTag = newTag;
            
            // Re-register with new tag
            if (this.pushSubscription) {
                await this.registerWithRelays();
            }
            return true;
        }
        
        // Check support
        if (!this.isSupported()) {
            Logger.warn('Push notifications not supported in this browser');
            return false;
        }
        
        try {
            // Calculate user tag
            this.myTag = newTag;
            Logger.info('Tag calculated:', this.myTag);
            
            // Register Service Worker
            this.swRegistration = await this.registerServiceWorker();
            if (!this.swRegistration) {
                return false;
            }
            
            // Check if we already have permission and subscription
            const hasExisting = await this.checkExistingSubscription();
            
            // Auto-enable push if no existing subscription (opt-out model)
            if (!hasExisting) {
                Logger.info('Auto-subscribing to push notifications...');
                await this.subscribe();
            }
            
            // Load channels with active notifications
            this.loadSubscribedChannels();
            
            // Start periodic re-registration to keep tokens fresh
            this.startReRegistrationTimer();
            
            this.initialized = true;
            Logger.info('RelayManager initialized');
            return true;
            
        } catch (error) {
            Logger.error('Initialization error:', error);
            return false;
        }
    }
    
    /**
     * Check if push notifications are supported.
     */
    isSupported() {
        return typeof window !== 'undefined' 
            && 'serviceWorker' in navigator 
            && 'PushManager' in window 
            && 'Notification' in window;
    }
    
    /**
     * Register the Service Worker.
     */
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            Logger.info('Service Worker registered');
            
            // Wait for SW to be ready
            await navigator.serviceWorker.ready;
            
            return registration;
        } catch (error) {
            Logger.error('Error registering Service Worker:', error);
            return null;
        }
    }
    
    /**
     * Check existing subscription.
     */
    async checkExistingSubscription() {
        try {
            this.pushSubscription = await this.swRegistration.pushManager.getSubscription();
            
            if (this.pushSubscription) {
                Logger.info('Existing subscription found');
                this.enabled = true;
                return true;
            }
            
            return false;
        } catch (error) {
            Logger.error('Error checking subscription:', error);
            return false;
        }
    }
    
    // ================================================
    // SUBSCRIPTION MANAGEMENT
    // ================================================
    
    /**
     * Request permission and subscribe to push notifications.
     * 
     * @param {string} vapidPublicKey - VAPID public key of the relay
     * @returns {Promise<PushSubscription|null>}
     */
    async subscribe(vapidPublicKey = null) {
        if (!this.initialized) {
            Logger.error('RelayManager not initialized');
            return null;
        }
        
        // Use first known VAPID key if not specified
        const vapidKey = vapidPublicKey || CONFIG.relays[0]?.vapidPublicKey;
        
        if (!vapidKey) {
            Logger.error('VAPID public key not available');
            return null;
        }
        
        try {
            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                Logger.warn('Permission denied');
                return null;
            }
            
            // Subscribe
            this.pushSubscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
            });
            
            this.enabled = true;
            Logger.info('Subscribed successfully');
            
            // Register with relays
            await this.registerWithRelays();
            
            return this.pushSubscription;
            
        } catch (error) {
            Logger.error('Error subscribing:', error);
            return null;
        }
    }
    
    /**
     * Cancel subscription.
     */
    async unsubscribe() {
        if (!this.pushSubscription) {
            return true;
        }
        
        try {
            await this.pushSubscription.unsubscribe();
            this.pushSubscription = null;
            this.enabled = false;
            
            // Clear storage
            localStorage.removeItem(CONFIG.storageKey);
            
            // Stop re-registration timer
            this.stopReRegistrationTimer();
            
            Logger.info('Subscription cancelled');
            return true;
        } catch (error) {
            Logger.error('Error cancelling subscription:', error);
            return false;
        }
    }
    
    // ================================================
    // RE-REGISTRATION TIMER
    // ================================================
    
    /**
     * Start periodic re-registration timer.
     * This ensures tokens are refreshed before they expire.
     */
    startReRegistrationTimer() {
        // Clear any existing timer
        this.stopReRegistrationTimer();
        
        if (!this.enabled || !this.pushSubscription) {
            return;
        }
        
        // Check if we need immediate re-registration based on last timestamp
        const stored = localStorage.getItem(CONFIG.storageKey);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                const elapsed = Date.now() - (data.timestamp || 0);
                
                // If more than interval has passed, re-register now
                if (elapsed > CONFIG.reRegistrationInterval) {
                    Logger.info('Token refresh needed (last registration was', Math.round(elapsed / 3600000), 'hours ago)');
                    this.registerWithRelays();
                }
            } catch (e) {
                // Invalid stored data, re-register
                this.registerWithRelays();
            }
        }
        
        // Set up periodic re-registration
        this.reRegistrationTimer = setInterval(() => {
            Logger.info('Periodic token refresh...');
            this.registerWithRelays().then(success => {
                if (success) {
                    Logger.info('Token refreshed successfully');
                } else {
                    Logger.warn('Token refresh failed - will retry next interval');
                }
            });
            
            // Also re-register channel subscriptions
            this.refreshChannelSubscriptions();
        }, CONFIG.reRegistrationInterval);
        
        Logger.debug('Re-registration timer started (interval:', CONFIG.reRegistrationInterval / 3600000, 'hours)');
    }
    
    /**
     * Stop re-registration timer.
     */
    stopReRegistrationTimer() {
        if (this.reRegistrationTimer) {
            clearInterval(this.reRegistrationTimer);
            this.reRegistrationTimer = null;
            Logger.debug('Re-registration timer stopped');
        }
    }
    
    /**
     * Refresh all channel subscriptions.
     */
    async refreshChannelSubscriptions() {
        if (this.subscribedChannels.size === 0) return;
        
        Logger.debug('Refreshing', this.subscribedChannels.size, 'channel subscriptions...');
        
        for (const streamId of this.subscribedChannels) {
            try {
                const channelTag = calculateChannelTag(streamId);
                const payload = createRegistrationPayload(channelTag, this.pushSubscription);
                await streamrController.client.publish(CONFIG.pushStreamId, payload);
            } catch (error) {
                Logger.warn('Failed to refresh channel subscription:', streamId.slice(0, 20) + '...');
            }
        }
    }
    
    // ================================================
    // RELAY REGISTRATION
    // ================================================
    
    /**
     * Register subscription with all known relays.
     */
    async registerWithRelays() {
        if (!this.pushSubscription || !this.myTag) {
            Logger.error('Cannot register - no subscription or tag');
            return false;
        }
        
        try {
            // Create registration payload
            const payload = createRegistrationPayload(
                this.myTag, 
                this.pushSubscription
            );
            
            // Publish to push stream (relay will receive)
            await streamrController.client.publish(CONFIG.pushStreamId, payload);
            
            // Save state
            localStorage.setItem(CONFIG.storageKey, JSON.stringify({
                tag: this.myTag,
                timestamp: Date.now()
            }));
            
            Logger.info('Registered with relays');
            return true;
            
        } catch (error) {
            Logger.error('Error registering with relays:', error);
            return false;
        }
    }
    
    // ================================================
    // SENDING NOTIFICATIONS
    // ================================================
    
    /**
     * Send a wake signal to notify a recipient.
     * This function calculates PoW and publishes the notification.
     * 
     * @param {string} recipientAddress - Recipient address
     * @returns {Promise<boolean>}
     */
    async sendWakeSignal(recipientAddress) {
        if (!this.initialized) {
            Logger.warn('RelayManager not initialized - ignoring wake signal');
            return false;
        }
        
        try {
            Logger.debug('Calculating PoW for:', recipientAddress);
            
            // Create payload with PoW (may take ~200ms)
            const payload = await createNotificationPayload(
                recipientAddress, 
                CONFIG.powDifficulty
            );
            
            // Publish to stream
            await streamrController.client.publish(CONFIG.pushStreamId, payload);
            
            Logger.debug('Wake signal sent to tag:', payload.tag);
            return true;
            
        } catch (error) {
            Logger.error('Error sending wake signal:', error);
            return false;
        }
    }
    
    /**
     * Send wake signals to multiple recipients.
     * Useful for groups.
     * 
     * @param {string[]} addresses - List of addresses
     * @returns {Promise<number>} Number of signals sent successfully
     */
    async sendWakeSignalBatch(addresses) {
        let sent = 0;
        
        for (const address of addresses) {
            if (await this.sendWakeSignal(address)) {
                sent++;
            }
            
            // Small delay between sends to avoid overloading
            await new Promise(r => setTimeout(r, 50));
        }
        
        return sent;
    }
    
    // ================================================
    // CHANNEL SUBSCRIPTION (opt-in for public/password)
    // ================================================
    
    /**
     * Load subscribed channels from localStorage.
     */
    loadSubscribedChannels() {
        try {
            const stored = localStorage.getItem(CONFIG.storageKey + '_channels');
            if (stored) {
                const channels = JSON.parse(stored);
                this.subscribedChannels = new Set(channels);
                Logger.debug('Channels with notifications:', this.subscribedChannels.size);
            }
        } catch (e) {
            Logger.warn('Error loading subscribed channels:', e);
        }
    }
    
    /**
     * Save subscribed channels to localStorage.
     */
    saveSubscribedChannels() {
        try {
            const channels = Array.from(this.subscribedChannels);
            localStorage.setItem(CONFIG.storageKey + '_channels', JSON.stringify(channels));
        } catch (e) {
            Logger.warn('Error saving subscribed channels:', e);
        }
    }
    
    /**
     * Enable notifications for a channel (opt-in).
     * Used for public and password channels.
     * 
     * @param {string} streamId - Channel stream ID
     * @returns {Promise<boolean>}
     */
    async subscribeToChannel(streamId) {
        if (!this.initialized || !this.pushSubscription) {
            Logger.error('Need to enable notifications first (subscribe())');
            return false;
        }
        
        try {
            const channelTag = calculateChannelTag(streamId);
            
            // Create registration payload for the channel
            const payload = createRegistrationPayload(
                channelTag,
                this.pushSubscription
            );
            
            // Publish to push stream
            await streamrController.client.publish(CONFIG.pushStreamId, payload);
            
            // Save locally
            this.subscribedChannels.add(streamId);
            this.saveSubscribedChannels();
            
            Logger.info('Notifications enabled for channel:', streamId.slice(0, 20) + '...');
            return true;
            
        } catch (error) {
            Logger.error('Error subscribing to channel:', error);
            return false;
        }
    }
    
    /**
     * Disable notifications for a channel.
     * Note: Token remains in relay until expiry.
     * 
     * @param {string} streamId - Channel stream ID
     * @returns {boolean}
     */
    unsubscribeFromChannel(streamId) {
        this.subscribedChannels.delete(streamId);
        this.saveSubscribedChannels();
        Logger.info('Notifications disabled for channel:', streamId.slice(0, 20) + '...');
        return true;
    }
    
    /**
     * Check if notifications are active for a channel.
     * 
     * @param {string} streamId - Channel stream ID
     * @returns {boolean}
     */
    isChannelSubscribed(streamId) {
        return this.subscribedChannels.has(streamId);
    }
    
    /**
     * Send wake signal for a channel (all subscribers).
     * Used when someone sends a message in a public/password channel.
     * 
     * @param {string} streamId - Channel stream ID
     * @returns {Promise<boolean>}
     */
    async sendChannelWakeSignal(streamId) {
        if (!this.initialized) {
            Logger.debug('RelayManager not initialized - ignoring channel wake signal');
            return false;
        }
        
        try {
            Logger.debug('Calculating PoW for channel:', streamId.slice(0, 20) + '...');
            
            // Create payload with PoW
            const payload = await createChannelNotificationPayload(
                streamId,
                CONFIG.powDifficulty
            );
            
            // Publish to stream
            await streamrController.client.publish(CONFIG.pushStreamId, payload);
            
            Logger.debug('Channel wake signal sent to tag:', payload.tag);
            return true;
            
        } catch (error) {
            Logger.error('Error sending channel wake signal:', error);
            return false;
        }
    }
    
    // ================================================
    // HELPERS
    // ================================================
    
    /**
     * Convert VAPID key from base64 to Uint8Array.
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
    
    /**
     * Handler for Service Worker messages.
     */
    handleServiceWorkerMessage(data) {
        if (!data || !data.type) return;
        
        switch (data.type) {
            case 'PUSH_RECEIVED':
                Logger.debug('Push received (app focused)');
                // Dispatch event to the app
                window.dispatchEvent(new CustomEvent('pombo-push-received', {
                    detail: { timestamp: data.timestamp }
                }));
                break;
                
            case 'NOTIFICATION_CLICKED':
                Logger.debug('Notification clicked');
                // Dispatch event to the app
                window.dispatchEvent(new CustomEvent('pombo-notification-clicked'));
                break;
        }
    }
    
    // ================================================
    // STATE / DEBUG
    // ================================================
    
    /**
     * Return current manager state.
     */
    getStatus() {
        return {
            supported: this.isSupported(),
            initialized: this.initialized,
            enabled: this.enabled,
            hasSubscription: !!this.pushSubscription,
            myTag: this.myTag,
            subscribedChannels: this.subscribedChannels.size,
            permission: typeof Notification !== 'undefined' 
                ? Notification.permission 
                : 'unsupported'
        };
    }
    
    /**
     * Return current configuration.
     */
    getConfig() {
        return { ...CONFIG };
    }
}

// ================================================
// SINGLETON EXPORT
// ================================================

export const relayManager = new RelayManager();
export default relayManager;
