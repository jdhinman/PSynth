// Keyboard and touch interface handling - main module
// This is now a lightweight wrapper that imports from specialized modules

import { initKeyboard, applyScale } from './keyboard/keyboardLayout.js';
import { setupTouchHandlers } from './keyboard/touchHandlers.js';
import { setupComputerKeyboardMapping } from './keyboard/computerKeyboard.js';

// Setup all keyboard listeners
export function setupKeyboardListeners() {
    // Set performance mode on by default for better responsiveness
    import('./noteProcessor.js').then(module => {
        if (module.setPerformanceMode) {
            module.setPerformanceMode(true);
        }
    });
    
    // Setup touch and mouse handlers
    setupTouchHandlers();
    
    // Add computer keyboard control
    setupComputerKeyboardMapping();
    
    console.log("Keyboard and touch listeners initialized");
}

// Re-export essential functions 
export { initKeyboard, applyScale };