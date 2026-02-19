/**
 * Modal Manager
 * Handles showing/hiding modals and common modal operations
 */

class ModalManager {
    constructor() {
        // Pending data storage for modals that need confirmation
        this.pendingData = {};
        this.deps = {};
    }

    /**
     * Set dependencies
     * @param {Object} deps - { showNotification }
     */
    setDependencies(deps) {
        this.deps = { ...this.deps, ...deps };
    }

    /**
     * Show a modal by ID
     * @param {string} modalId - Modal element ID
     * @param {Object} options - Optional config { focusElement, clearInputs }
     */
    show(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.classList.remove('hidden');
        
        // Clear inputs if specified
        if (options.clearInputs) {
            modal.querySelectorAll('input').forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            });
        }
        
        // Focus element if specified
        if (options.focusElement) {
            const focusEl = modal.querySelector(options.focusElement);
            focusEl?.focus();
        }
    }

    /**
     * Hide a modal by ID
     * @param {string} modalId - Modal element ID
     */
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Toggle modal visibility
     * @param {string} modalId - Modal element ID
     */
    toggle(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.toggle('hidden');
        }
    }

    /**
     * Check if modal is visible
     * @param {string} modalId - Modal element ID
     * @returns {boolean}
     */
    isVisible(modalId) {
        const modal = document.getElementById(modalId);
        return modal && !modal.classList.contains('hidden');
    }

    /**
     * Set pending data for a modal
     * @param {string} key - Data key
     * @param {*} value - Data value
     */
    setPendingData(key, value) {
        this.pendingData[key] = value;
    }

    /**
     * Get pending data
     * @param {string} key - Data key
     * @returns {*}
     */
    getPendingData(key) {
        return this.pendingData[key];
    }

    /**
     * Clear pending data
     * @param {string} key - Data key (optional, clears all if not provided)
     */
    clearPendingData(key) {
        if (key) {
            delete this.pendingData[key];
        } else {
            this.pendingData = {};
        }
    }

    /**
     * Show join channel modal
     * @param {HTMLElement} modal - Modal element
     * @param {HTMLElement} streamIdInput - Stream ID input
     * @param {HTMLElement} passwordInput - Password input
     * @param {HTMLElement} passwordField - Password field container
     */
    showJoinChannelModal(modal, streamIdInput, passwordInput, passwordField) {
        modal?.classList.remove('hidden');
        if (streamIdInput) streamIdInput.value = '';
        if (passwordInput) passwordInput.value = '';
        passwordField?.classList.add('hidden');
        
        const checkbox = document.getElementById('join-has-password');
        if (checkbox) checkbox.checked = false;
    }

    /**
     * Show join closed channel modal
     * @param {string} streamId - Pre-filled stream ID
     */
    showJoinClosedChannelModal(streamId = '') {
        const modal = document.getElementById('join-closed-channel-modal');
        const idInput = document.getElementById('join-closed-stream-id-input');
        const nameInput = document.getElementById('join-closed-name-input');
        
        if (idInput) idInput.value = streamId;
        if (nameInput) nameInput.value = '';
        
        modal?.classList.remove('hidden');
    }

    /**
     * Show add contact modal
     * @param {string} address - Contact address
     */
    showAddContactModal(address) {
        const modal = document.getElementById('add-contact-nickname-modal');
        const addressDisplay = document.getElementById('add-contact-modal-address');
        const nicknameInput = document.getElementById('add-contact-modal-nickname');
        
        if (!modal || !addressDisplay || !nicknameInput) return;
        
        this.setPendingData('contactAddress', address);
        addressDisplay.textContent = address;
        nicknameInput.value = '';
        
        modal.classList.remove('hidden');
        nicknameInput.focus();
    }

    /**
     * Hide add contact modal
     */
    hideAddContactModal() {
        this.hide('add-contact-nickname-modal');
        this.clearPendingData('contactAddress');
    }

    /**
     * Show remove contact modal
     * @param {string} address - Contact address
     * @param {Function} callback - Callback after removal
     */
    showRemoveContactModal(address, callback = null) {
        const modal = document.getElementById('remove-contact-modal');
        const addressDisplay = document.getElementById('remove-contact-modal-address');
        
        if (!modal || !addressDisplay) return;
        
        this.setPendingData('removeContactAddress', address);
        this.setPendingData('removeContactCallback', callback);
        addressDisplay.textContent = address;
        
        modal.classList.remove('hidden');
    }

    /**
     * Hide remove contact modal
     */
    hideRemoveContactModal() {
        this.hide('remove-contact-modal');
        this.clearPendingData('removeContactAddress');
        this.clearPendingData('removeContactCallback');
    }



    /**
     * Hide new channel modal
     */
    hideNewChannelModal() {
        this.hide('new-channel-modal');
    }

}

// Export singleton instance
export const modalManager = new ModalManager();
