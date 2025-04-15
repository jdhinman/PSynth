// Main entry point for PocketSynth application
import { initAudio, stopAllNotes } from './audioEngine.js';
import { setupUIControls, updateControlDisplays } from './uiControls.js';
import { initKeyboard } from './keyboardInterface.js';
import { resetNoteState } from './noteProcessor.js';
import { initVisualizer, resizeVisualizer } from './visualizer.js';
import { updatePresetSelectOptions } from './presets.js';

// Main initialization function
document.addEventListener('DOMContentLoaded', function() {
    console.log("PocketSynth initializing...");
    
    // Initialize UI controls
    setupUIControls();
    
    // Initialize keyboard first
    initKeyboard(4);
    
    // Add a message to prompt user interaction
    const container = document.querySelector('.container');
    const startMessage = document.createElement('div');
    startMessage.className = 'start-message';
    startMessage.innerHTML = `
        <div class="message-content">
            <h3>Tap anywhere to start</h3>
            <p>Audio requires user interaction to begin</p>
        </div>
    `;
    container.appendChild(startMessage);
    
    // Force debugging to be visible on mobile
    window.onerror = function(message, source, lineno, colno, error) {
        console.error(message, "at", source, lineno, colno);
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.bottom = '0';
        errorDiv.style.left = '0';
        errorDiv.style.right = '0';
        errorDiv.style.background = 'rgba(255, 0, 0, 0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '10px';
        errorDiv.style.zIndex = '10000';
        errorDiv.style.fontSize = '12px';
        errorDiv.textContent = `Error: ${message} at ${source}:${lineno}:${colno}`;
        document.body.appendChild(errorDiv);
        return true;
    };
    
    // Initialize audio on first user interaction with better initialization
    const initialUserInteractionHandler = function(e) {
        console.log("User interaction detected, initializing audio", e.type);
        
        // Remove start message if it exists
        const startMsg = document.querySelector('.start-message');
        if (startMsg) startMsg.remove();
        
        // Initialize audio engine
        initAudio().then(audioContext => {
            if (audioContext) {
                console.log("Audio context initialized:", audioContext.state);
                
                // Initialize visualizer once audio is ready
                import('./audioEngine.js').then(module => {
                    const masterGainNode = module.getMasterGainNode();
                    if (masterGainNode) {
                        initVisualizer(audioContext, masterGainNode);
                        resizeVisualizer();
                    }
                });
                
                // Play a test tone to ensure audio is working
                try {
                    const testOsc = audioContext.createOscillator();
                    const testGain = audioContext.createGain();
                    testGain.gain.value = 0.1;
                    testOsc.connect(testGain);
                    testGain.connect(audioContext.destination);
                    testOsc.start();
                    setTimeout(() => testOsc.stop(), 100);
                } catch (e) {
                    console.error("Test tone error:", e);
                }
                
                // Update UI displays with current values
                updateControlDisplays();
                
                // Update preset options
                updatePresetSelectOptions();
                
                // Reinitialize keyboard event handlers to ensure they work
                import('./keyboardInterface.js').then(module => {
                    module.setupKeyboardListeners();
                });
            } else {
                console.error("Failed to initialize audio context");
                alert("Failed to initialize audio. Please try refreshing the page.");
            }
        }).catch(err => {
            console.error("Error during audio initialization:", err);
            alert("Audio initialization error. Please try a different browser.");
        });
        
        // Remove these event listeners
        document.removeEventListener('touchstart', initialUserInteractionHandler, true);
        document.removeEventListener('mousedown', initialUserInteractionHandler, true);
        document.removeEventListener('click', initialUserInteractionHandler, true);
    };
    
    // Use capture phase to ensure these events are processed first
    document.addEventListener('touchstart', initialUserInteractionHandler, true);
    document.addEventListener('mousedown', initialUserInteractionHandler, true);
    document.addEventListener('click', initialUserInteractionHandler, true);
    
    // Set up panic button
    const panicButton = document.getElementById('panic-button');
    panicButton.addEventListener('click', function() {
        console.log("Panic button pressed - stopping all sounds");
        this.classList.add('pressed');
        this.textContent = "Stopping Sounds...";
        
        // First stop all notes
        stopAllNotes();
        resetNoteState();
        
        // Give visual feedback
        setTimeout(() => {
            this.classList.remove('pressed');
            this.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="2"/>
                    <path d="M15 9L9 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <path d="M9 9L15 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Stop All Sounds
            `;
        }, 300);
    });
    
    // Check browser support
    if (!window.AudioContext && !window.webkitAudioContext) {
        alert("Your browser doesn't support Web Audio API. Please try a different browser.");
    }
    
    console.log("PocketSynth initialization complete");
});