/**
 * Dropdown Manager
 * Handles channel dropdown menu and positioning logic
 */

class DropdownManager {
    constructor() {
        this.deps = {};
    }

    /**
     * Set dependencies
     * @param {Object} deps - { onChannelMenuAction }
     */
    setDependencies(deps) {
        this.deps = { ...this.deps, ...deps };
    }

    /**
     * Show channel dropdown menu
     * @param {Event} e - Click event
     * @param {HTMLElement} menuBtn - The menu button element
     * @param {Object} channel - Current channel info
     */
    showChannelDropdown(e, menuBtn, channel) {
        if (!channel) return;
        
        // Close any existing dropdown
        this.closeChannelDropdown();
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.id = 'channel-dropdown-menu';
        dropdown.className = 'fixed bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-1 z-[9999] min-w-[180px] overflow-hidden';
        dropdown.innerHTML = `
            <button class="channel-action w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm text-white/70 hover:text-white transition flex items-center gap-2" data-action="copy-stream-id">
                <span class="w-4 h-4 flex items-center justify-center font-semibold text-base">#</span>
                Copy Channel ID
            </button>
            <button class="channel-action w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm text-white/70 hover:text-white transition flex items-center gap-2" data-action="channel-settings">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Channel Settings
            </button>
            <div class="my-1 border-t border-white/5"></div>
            <button class="channel-action w-full text-left px-4 py-2.5 hover:bg-red-500/10 text-sm text-white/50 hover:text-red-400 transition flex items-center gap-2" data-action="leave-channel">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
                Leave Channel
            </button>
        `;
        
        document.body.appendChild(dropdown);
        
        // Position dropdown below button
        const btnRect = menuBtn.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        
        let left = btnRect.left;
        let top = btnRect.bottom + 4;
        
        // If would go off right edge, align to right side
        if (left + dropdownRect.width > window.innerWidth - 8) {
            left = btnRect.right - dropdownRect.width;
        }
        
        // If would go off bottom, show above
        if (top + dropdownRect.height > window.innerHeight - 8) {
            top = btnRect.top - dropdownRect.height - 4;
        }
        
        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
        
        // Attach action listeners
        dropdown.querySelectorAll('.channel-action').forEach(actionBtn => {
            actionBtn.addEventListener('click', async (evt) => {
                evt.stopPropagation();
                const action = actionBtn.dataset.action;
                this.closeChannelDropdown();
                if (this.deps.onChannelMenuAction) {
                    await this.deps.onChannelMenuAction(action);
                }
            });
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', this.closeChannelDropdown.bind(this), { once: true });
        }, 0);
    }
    
    /**
     * Close channel dropdown menu
     */
    closeChannelDropdown() {
        const existing = document.getElementById('channel-dropdown-menu');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Close all dropdowns (user and channel)
     */
    closeAllDropdowns() {
        this.closeChannelDropdown();
        const userDropdown = document.getElementById('user-dropdown-menu');
        if (userDropdown) {
            userDropdown.remove();
        }
    }
}

// Export singleton instance
export const dropdownManager = new DropdownManager();
