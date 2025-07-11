(function() {
    'use strict';

    let isPickerOpen = false;
    let originalList = null;
    let filteredItems = [];
    let selectedIndex = 0;
    let filterText = '';
    let instructionMessage = null;

    function showInstructionMessage(list) {
        const listRect = list.getBoundingClientRect();
        
        instructionMessage = document.createElement('div');
        instructionMessage.textContent = '↑↓ navigate • type to filter • Enter to select';
        instructionMessage.style.cssText = `
            position: fixed;
            left: ${listRect.right + 12}px;
            top: ${listRect.top}px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            z-index: 10000;
            pointer-events: none;
            white-space: nowrap;
        `;
        
        document.body.appendChild(instructionMessage);
    }

    function hideInstructionMessage() {
        if (instructionMessage) {
            instructionMessage.remove();
            instructionMessage = null;
        }
    }

    function focusChatInput() {
        // Try to find and focus the main chat input
        const selectors = [
            '#prompt-textarea',
            '[data-testid="prompt-textarea"]',
            'textarea[placeholder*="Message"]',
            'textarea[placeholder*="message"]',
            'div[contenteditable="true"]',
            '[role="textbox"]'
        ];
        
        for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input) {
                setTimeout(() => {
                    input.focus();
                    // Move cursor to end if it's a textarea
                    if (input.tagName === 'TEXTAREA') {
                        input.setSelectionRange(input.value.length, input.value.length);
                    }
                }, 100);
                return true;
            }
        }
        return false;
    }

    function findModelPicker() {
        const selectors = [
            '[data-testid="model-switcher"]',
            'button[aria-label*="model"]',
            'button[data-testid*="model"]',
            '.model-selector',
            '[class*="model"][class*="button"]'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
            const text = button.textContent.toLowerCase();
            if (text.includes('gpt') || text.includes('o1') || text.includes('o3') || 
                text.includes('4o') || text.includes('model')) {
                return button;
            }
        }
        
        return null;
    }

    function findModelList() {
        const selectors = [
            '[role="menu"]',
            '[role="listbox"]',
            '.model-list',
            '[data-testid*="model-list"]',
            '[class*="dropdown"][class*="menu"]',
            '[class*="popover"]'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
                return element;
            }
        }
        
        return null;
    }

    function getModelItems(container) {
        const selectors = [
            '[role="menuitem"]',
            '[role="option"]',
            'button[data-testid*="model"]',
            '.model-item',
            'li button',
            'div[role="button"]'
        ];
        
        let items = [];
        for (const selector of selectors) {
            items = Array.from(container.querySelectorAll(selector));
            if (items.length > 0) break;
        }
        
        if (items.length === 0) {
            items = Array.from(container.querySelectorAll('button, [role="button"], li'));
        }
        
        return items.filter(item => {
            const text = item.textContent.trim();
            return text && text.length > 0;
        });
    }

    function filterItems(items, query) {
        if (!query) return items;
        
        const lowerQuery = query.toLowerCase();
        return items.filter(item => {
            const text = item.textContent.toLowerCase();
            return text.includes(lowerQuery);
        });
    }

    function highlightSelected(items, index) {
        // Clear all existing highlights first
        const allItems = getModelItems(originalList);
        allItems.forEach(item => {
            item.style.backgroundColor = '';
            item.style.outline = '';
        });
        
        // Then highlight only the selected filtered item
        items.forEach((item, i) => {
            if (i === index) {
                item.style.backgroundColor = '#e5e5e5';
                item.style.outline = '2px solid #0066cc';
            }
        });
        
        if (items[index]) {
            items[index].scrollIntoView({ block: 'nearest' });
        }
    }

    function openModelPicker() {
        // First, find the visible model picker button
        const allPickers = document.querySelectorAll('[data-testid="model-switcher-dropdown-button"]');
        let visiblePicker = null;
        
        for (const picker of allPickers) {
            const rect = picker.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                visiblePicker = picker;
                break;
            }
        }
        
        // Fallback to the old method if specific selector doesn't work
        if (!visiblePicker) {
            const picker = findModelPicker();
            if (!picker) {
                return false;
            }
            const pickerRect = picker.getBoundingClientRect();
            
            if (pickerRect.width > 0 && pickerRect.height > 0) {
                visiblePicker = picker;
            } else {
                const allButtons = Array.from(document.querySelectorAll('button'));
                const modelButtons = allButtons.filter(btn => {
                    const text = btn.textContent.toLowerCase();
                    return text.includes('gpt') || text.includes('4o') || text.includes('o1') || text.includes('o3');
                });
                
                visiblePicker = modelButtons.find(btn => {
                    const rect = btn.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });
            }
        }
        
        if (!visiblePicker) {
            return false;
        }
        
        // Capture the visible picker button position BEFORE we click it
        const pickerRect = visiblePicker.getBoundingClientRect();
        
        // Try different approaches to trigger the button
        try {
            visiblePicker.focus();
            
            // Method 1: Try Space key on focused element (works best with React)
            visiblePicker.dispatchEvent(new KeyboardEvent('keydown', { 
                key: ' ', 
                code: 'Space', 
                keyCode: 32,
                bubbles: true, 
                cancelable: true 
            }));
            
            // Method 2: Try standard click as fallback
            visiblePicker.click();
            
        } catch (e) {
            console.log('Interaction failed:', e);
        }
        
        // Wait for dropdown to appear and then set up keyboard navigation
        const checkForDropdown = (attempt = 0) => {
            const list = findModelList();
            if (list) {
                originalList = list;
                
                const listRect = list.getBoundingClientRect();
                
                // Check if dropdown is misplaced and needs repositioning
                if (pickerRect.left > 0 && pickerRect.bottom > 0 && 
                    (listRect.left < pickerRect.left - 50 || listRect.left === 0)) {
                    
                    // Store original styles to avoid breaking width
                    const originalWidth = list.style.width || getComputedStyle(list).width;
                    
                    // Apply positioning fix while preserving width
                    list.style.position = 'fixed';
                    list.style.left = `${pickerRect.left}px`;
                    list.style.top = `${pickerRect.bottom + 4}px`;
                    list.style.width = originalWidth;
                    list.style.zIndex = '9999';
                    
                }
                
                
                const items = getModelItems(list);
                filteredItems = [...items];
                selectedIndex = 0;
                filterText = '';
                isPickerOpen = true;
                
                if (items.length > 0) {
                    highlightSelected(filteredItems, selectedIndex);
                }
                
                showInstructionMessage(list);
                
                return true;
            } else if (attempt < 3) {
                // Try again with increasing delays
                setTimeout(() => checkForDropdown(attempt + 1), 100 * (attempt + 1));
            }
            return false;
        };
        
        checkForDropdown();
        
        return true;
    }

    function closeModelPicker() {
        if (originalList) {
            const items = getModelItems(originalList);
            items.forEach(item => {
                item.style.backgroundColor = '';
                item.style.outline = '';
            });
        }
        
        hideInstructionMessage();
        document.body.click();
        isPickerOpen = false;
        originalList = null;
        filteredItems = [];
        selectedIndex = 0;
        filterText = '';
    }

    function selectCurrentModel() {
        if (filteredItems.length > 0 && filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].click();
            closeModelPicker();
            // Focus the chat input after model selection
            focusChatInput();
            return true;
        }
        return false;
    }

    function navigateList(direction) {
        if (filteredItems.length === 0) return;
        
        if (direction === 'up') {
            selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredItems.length - 1;
        } else if (direction === 'down') {
            selectedIndex = selectedIndex < filteredItems.length - 1 ? selectedIndex + 1 : 0;
        }
        
        highlightSelected(filteredItems, selectedIndex);
    }

    function handleFilter(char) {
        if (!originalList) return;
        
        filterText += char;
        const allItems = getModelItems(originalList);
        filteredItems = filterItems(allItems, filterText);
        selectedIndex = 0;
        
        if (filteredItems.length > 0) {
            highlightSelected(filteredItems, selectedIndex);
        }
    }

    function handleBackspace() {
        if (filterText.length > 0) {
            filterText = filterText.slice(0, -1);
            const allItems = getModelItems(originalList);
            filteredItems = filterItems(allItems, filterText);
            selectedIndex = 0;
            
            if (filteredItems.length > 0) {
                highlightSelected(filteredItems, selectedIndex);
            }
        }
    }

    function handleKeyDown(e) {
        // Check for Cmd+Shift+P (using both key and code for better compatibility)
        if (e.metaKey && e.shiftKey && (e.key === 'P' || e.code === 'KeyP')) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!isPickerOpen) {
                openModelPicker();
            } else {
                closeModelPicker();
            }
            return;
        }
        
        if (!isPickerOpen) return;
        
        switch(e.key) {
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                closeModelPicker();
                break;
                
            case 'Enter':
                e.preventDefault();
                e.stopPropagation();
                selectCurrentModel();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                navigateList('up');
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                navigateList('down');
                break;
                
            case 'Backspace':
                e.preventDefault();
                e.stopPropagation();
                handleBackspace();
                break;
                
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFilter(e.key);
                }
                break;
        }
    }

    function setupTooltip() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const shortcut = isMac ? 'Cmd+Shift+P' : 'Ctrl+Shift+P';
        const tooltipText = `Press ${shortcut} to open model picker`;
        
        // Find all model picker buttons (there can be multiple for mobile/desktop)
        const buttons = document.querySelectorAll('[data-testid="model-switcher-dropdown-button"]');
        buttons.forEach(button => {
            if (!button.hasAttribute('title')) {
                button.setAttribute('title', tooltipText);
            }
        });
    }

    document.addEventListener('keydown', handleKeyDown, true);

    document.addEventListener('click', function(e) {
        if (isPickerOpen && originalList && !originalList.contains(e.target)) {
            closeModelPicker();
        }
    });

    // Set up tooltip when page loads and periodically check for new buttons
    setupTooltip();
    setInterval(setupTooltip, 2000);

    console.log('ChatGPT Model Picker extension loaded');
})();
