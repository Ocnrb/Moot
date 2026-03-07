/**
 * HeaderUI
 * Manages the header/toolbar area: wallet info, network status,
 * channel title/info, and connection indicators.
 */

import { escapeHtml } from './utils.js';

class HeaderUI {
    constructor() {
        this.deps = {};
        
        // DOM elements
        this.elements = {
            walletInfo: null,
            connectWalletBtn: null,
            walletControls: null,
            switchWalletBtn: null,
            contactsBtn: null,
            settingsBtn: null,
            currentChannelName: null,
            currentChannelInfo: null,
            chatHeaderRight: null
        };
    }

    /**
     * Inject dependencies
     * @param {Object} deps - { }
     */
    setDependencies(deps) {
        this.deps = { ...this.deps, ...deps };
    }

    /**
     * Initialize with DOM elements
     * @param {Object} elements - Header-related DOM elements
     */
    init(elements) {
        this.elements = {
            walletInfo: elements.walletInfo,
            connectWalletBtn: elements.connectWalletBtn,
            walletControls: elements.walletControls,
            switchWalletBtn: elements.switchWalletBtn,
            contactsBtn: elements.contactsBtn,
            settingsBtn: elements.settingsBtn,
            currentChannelName: elements.currentChannelName,
            currentChannelInfo: elements.currentChannelInfo,
            chatHeaderRight: elements.chatHeaderRight
        };
    }

    /**
     * Update wallet info display
     * @param {string} address - Wallet address
     * @param {boolean} isGuest - Whether connected as Guest
     */
    updateWalletInfo(address, isGuest = false) {
        const { walletInfo, connectWalletBtn, walletControls, contactsBtn, settingsBtn } = this.elements;
        
        if (address) {
            if (isGuest) {
                // Guest mode: show "Guest" with different styling
                walletInfo.innerHTML = `<span class="text-amber-400">Guest</span>`;
                // For Guest: show Connect button to allow creating account
                connectWalletBtn.classList.remove('hidden');
                connectWalletBtn.innerHTML = `
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                    </svg>
                    Create Account
                `;
                // Hide wallet controls for guest
                walletControls?.classList.add('hidden');
                // Hide contacts button for guest
                contactsBtn?.classList.add('hidden');
            } else {
                const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
                walletInfo.textContent = short;
                // Hide connect button, show wallet controls
                connectWalletBtn.classList.add('hidden');
                walletControls?.classList.remove('hidden');
                // Show contacts button
                contactsBtn?.classList.remove('hidden');
            }
            // Show settings button
            settingsBtn?.classList.remove('hidden');
        } else {
            walletInfo.textContent = 'Not Connected';
            // Show connect button with original text, hide wallet controls
            connectWalletBtn.innerHTML = `
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                </svg>
                Connect
            `;
            connectWalletBtn.classList.remove('hidden');
            walletControls?.classList.add('hidden');
            // Hide contacts button
            contactsBtn?.classList.add('hidden');
            // Hide settings button
            settingsBtn?.classList.add('hidden');
        }
    }

    /**
     * Update switch wallet button visibility
     * @param {boolean} show - Whether to show the switch button
     */
    updateSwitchWalletButton(show) {
        if (show) {
            this.elements.switchWalletBtn?.classList.remove('hidden');
        } else {
            this.elements.switchWalletBtn?.classList.add('hidden');
        }
    }

    /**
     * Update network status indicator
     * @param {string} status - Status message
     * @param {boolean} connected - Connection status
     */
    updateNetworkStatus(status, connected = false) {
        const dot = document.getElementById('network-dot');
        if (!dot) return;
        
        if (connected) {
            dot.classList.remove('bg-[#444]', 'bg-amber-400');
            dot.classList.add('bg-emerald-400');
        } else if (status.toLowerCase().includes('connecting')) {
            dot.classList.remove('bg-[#444]', 'bg-emerald-400');
            dot.classList.add('bg-amber-400');
        } else {
            dot.classList.remove('bg-emerald-400', 'bg-amber-400');
            dot.classList.add('bg-[#444]');
        }
    }

    /**
     * Update channel title in header
     * @param {string} name - Channel name
     */
    updateChannelTitle(name) {
        if (this.elements.currentChannelName) {
            this.elements.currentChannelName.textContent = name;
        }
    }

    /**
     * Update channel info (type label) in header
     * @param {string} type - Channel type
     * @param {boolean} readOnly - Whether channel is read-only
     */
    updateChannelInfo(type, readOnly = false) {
        if (this.elements.currentChannelInfo) {
            this.elements.currentChannelInfo.innerHTML = this.getChannelTypeLabel(type, readOnly);
            this.elements.currentChannelInfo.parentElement?.classList.remove('hidden');
        }
    }

    /**
     * Hide channel info section
     */
    hideChannelInfo() {
        if (this.elements.currentChannelInfo) {
            this.elements.currentChannelInfo.textContent = '';
            this.elements.currentChannelInfo.parentElement?.classList.add('hidden');
        }
    }

    /**
     * Show/hide header right section (menu buttons)
     * @param {boolean} show - Whether to show
     */
    showHeaderRight(show) {
        if (show) {
            this.elements.chatHeaderRight?.classList.remove('hidden');
        } else {
            this.elements.chatHeaderRight?.classList.add('hidden');
        }
    }

    /**
     * Get channel type label HTML
     * @param {string} type - Channel type
     * @param {boolean} readOnly - Whether channel is read-only
     * @returns {string} - HTML with icon and label
     */
    getChannelTypeLabel(type, readOnly = false) {
        // Pencil-slash icon for read-only indicator
        const roIcon = readOnly ? '<svg class="w-3 h-3 ml-1 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"/></svg>' : '';
        const labels = {
            'public': `<span class="inline-flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Open${roIcon}</span>`,
            'password': `<span class="inline-flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>Protected${roIcon}</span>`,
            'native': `<span class="inline-flex items-center gap-1"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l-8 13.5 8 4.5 8-4.5-8-13.5zm0 18l-8-4.5 8 9 8-9-8 4.5z"/></svg>Closed${roIcon}</span>`
        };
        // Security: escape unknown types to prevent XSS
        return labels[type] || escapeHtml(String(type || 'Unknown'));
    }

    /**
     * Set header to "Explore" mode
     */
    setExploreMode() {
        this.updateChannelTitle('Explore Channels');
        this.hideChannelInfo();
        this.showHeaderRight(false);
    }

    /**
     * Set header to channel mode
     * @param {Object} channel - Channel object with name, type, readOnly
     */
    setChannelMode(channel) {
        this.updateChannelTitle(channel.name);
        this.updateChannelInfo(channel.type, channel.readOnly);
        this.showHeaderRight(true);
    }
}

// Export singleton
export const headerUI = new HeaderUI();
