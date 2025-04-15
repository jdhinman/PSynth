// Note processing functionality
import { 
    getAudioContext, 
    getMasterGainNode, 
    initAudio,
    createOscillator
} from './audioEngine.js';

let activeOscillators = {};
let activeGainNodes = {};
let activeTouches = new Map(); // Track active touches globally
let performanceMode = true; // Enable performance optimizations

// Export for waveform changes and emergency cleanup
export function getActiveOscillators() {
    return activeOscillators;
}

// Create a function to play a note - with optimized performance
export function playNote(frequency, noteId, volumeMultiplier = 1.0) {
    console.log(`Playing note ${noteId} at ${frequency}Hz with volume ${volumeMultiplier}`);
    
    // Ensure audio context is initialized
    if (!getAudioContext()) {
        console.log("Audio context not initialized, initializing now");
        initAudio().then(context => {
            if (context) {
                console.log("Audio initialized on-demand, playing note");
                playNoteWithContext(frequency, noteId, context, volumeMultiplier);
            } else {
                console.error("Failed to initialize audio context on demand");
            }
        });
        return;
    }
    
    // Force resume context if suspended
    const audioContext = getAudioContext();
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("Audio context resumed before playing note");
            playNoteWithContext(frequency, noteId, audioContext, volumeMultiplier);
        });
        return;
    }
    
    playNoteWithContext(frequency, noteId, audioContext, volumeMultiplier);
}

// Function to play a note with context
function playNoteWithContext(frequency, noteId, audioContext, volumeMultiplier = 1.0) {
    const masterGainNode = getMasterGainNode();
    
    if (!audioContext || !masterGainNode) {
        console.error("Audio system not fully initialized");
        return;
    }
    
    try {
        // If an oscillator already exists for this note, stop it properly first
        if (activeOscillators[noteId]) {
            stopNote(noteId, true); // true = immediate stop for replaying the same note
        }
        
        // Create oscillator with current waveform type
        const waveform = document.getElementById('waveform').value;
        const oscillator = createOscillator(frequency, waveform);
        
        if (!oscillator) {
            console.error("Failed to create oscillator");
            return;
        }
        
        // Create gain node with volume multiplier to prevent distortion
        const gainNode = audioContext.createGain();
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        
        // Get envelope values with fallbacks for reliability
        const attackTime = Math.max(0.005, parseFloat(document.getElementById('attack').value) || 0.05);
        const releaseTime = Math.max(0.01, parseFloat(document.getElementById('release').value) || 0.2);
        
        // Apply volume multiplier to reduce distortion when playing chords
        // Start with a tiny value to avoid clicks
        gainNode.gain.setValueAtTime(0.001, now);
        
        // Use shorter attack for better responsiveness
        const effectiveAttackTime = Math.min(0.1, attackTime);
        
        // Apply volume multiplier to reduce overall level for chords
        // This helps prevent audio clipping when many notes play simultaneously
        const baseVolume = 0.8 * volumeMultiplier;
        
        // Use exponential ramp for more natural envelope
        gainNode.gain.exponentialRampToValueAtTime(baseVolume, now + effectiveAttackTime);
        
        // Connect oscillator → gainNode → masterGainNode
        oscillator.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        // Start the oscillator 
        if (!oscillator.detunedOscs) { // This is a simple oscillator
            oscillator.start(0); // Explicit start time for lower latency
        }
        
        // Store references to stop them later
        activeOscillators[noteId] = oscillator;
        activeGainNodes[noteId] = gainNode;
        
        // Add active class to the key with visual feedback
        const keyElement = document.querySelector(`[data-note="${noteId.split('-')[0]}"]`);
        if (keyElement) {
            keyElement.classList.add('active');
            // Add dynamic glow intensity based on volume
            const glowIntensity = Math.min(100, 50 + (masterGainNode.gain.value * 50));
            keyElement.style.setProperty('--glow-intensity', `${glowIntensity}%`);
        }
    } catch (e) {
        console.error("Error playing note:", e);
    }
}

// Optimized function to stop a note
export function stopNote(noteId, immediate = false) {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    
    try {
        if (activeOscillators[noteId] && activeGainNodes[noteId]) {
            const gainNode = activeGainNodes[noteId];
            const oscillator = activeOscillators[noteId];
            const now = audioContext.currentTime;
            
            if (immediate) {
                // Stop immediately (for replaying same note)
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(0, now);
                
                try {
                    oscillator.stop(now);
                } catch (e) {
                    console.warn("Error stopping oscillator:", e);
                }
                
                // Clean up references immediately
                delete activeOscillators[noteId];
                delete activeGainNodes[noteId];
            } else {
                // Release phase with scheduled cleanup
                const releaseTime = Math.max(0.01, parseFloat(document.getElementById('release').value) || 0.2);
                
                // Use shorter release times in performance mode for better responsiveness
                const effectiveReleaseTime = performanceMode && releaseTime > 0.5 ? 0.3 : releaseTime;
                
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(gainNode.gain.value || 0.001, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + effectiveReleaseTime);
                
                // Schedule oscillator to stop after release with a safety margin
                try {
                    oscillator.stop(now + effectiveReleaseTime + 0.05);
                } catch (e) {
                    console.warn("Error scheduling oscillator stop:", e);
                }
                
                // Clean up references after release completes
                setTimeout(() => {
                    delete activeOscillators[noteId];
                    delete activeGainNodes[noteId];
                }, effectiveReleaseTime * 1000 + 100);
            }
            
            // Remove active visual state from key
            if (!noteId.includes('-chord')) {
                const keyElement = document.querySelector(`[data-note="${noteId}"]`);
                if (keyElement) {
                    keyElement.classList.remove('active');
                    keyElement.style.removeProperty('--glow-intensity');
                }
            }
        }
    } catch (e) {
        console.error("Error stopping note:", e);
        
        // Forceful cleanup in case of error
        if (!noteId.includes('-chord')) {
            const keyElement = document.querySelector(`[data-note="${noteId}"]`);
            if (keyElement) {
                keyElement.classList.remove('active');
                keyElement.style.removeProperty('--glow-intensity');
            }
        }
        
        delete activeOscillators[noteId];
        delete activeGainNodes[noteId];
    }
}

// Enhanced stop all active notes with immediate option
export function stopAllActive(immediate = false) {
    // First collect all note IDs to avoid modification during iteration
    const noteIds = Object.keys(activeOscillators);
    console.log(`Stopping all ${noteIds.length} active notes${immediate ? ' immediately' : ''}`);
    
    try {
        // Stop each note
        noteIds.forEach(noteId => {
            const osc = activeOscillators[noteId];
            const gain = activeGainNodes[noteId];
            
            if (osc && gain) {
                const audioContext = getAudioContext();
                const now = audioContext.currentTime;
                
                // Immediately silence and stop if requested
                gain.gain.cancelScheduledValues(now);
                gain.gain.setValueAtTime(0, now);
                
                try {
                    osc.stop(now);
                    
                    // Also stop any detuned oscillators
                    if (osc.detunedOscs) {
                        osc.detunedOscs.forEach(detunedOsc => {
                            try {
                                detunedOsc.stop(now);
                            } catch (e) {
                                console.warn("Error stopping detuned oscillator:", e);
                            }
                        });
                    }
                } catch (e) {
                    console.warn("Error stopping oscillator in stopAllActive:", e);
                }
            }
            
            // Remove references immediately
            delete activeOscillators[noteId];
            delete activeGainNodes[noteId];
        });
    } catch (e) {
        console.error("Error in stopAllActive:", e);
    }
    
    // Clear all active touches
    activeTouches.clear();
    
    // Remove active class from all keys
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('active');
        key.style.removeProperty('--glow-intensity');
    });
    
    console.log("All notes stopped");
}

// Reset note state (for emergency cleanup)
export function resetNoteState() {
    // Force stop any oscillators before cleaning up
    try {
        Object.values(activeOscillators).forEach(osc => {
            if (osc) {
                try {
                    osc.stop();
                } catch(e) {}
            }
        });
    } catch (e) {
        console.error("Error stopping oscillators:", e);
    }
    
    activeOscillators = {};
    activeGainNodes = {};
    activeTouches.clear();
    
    // Remove active class from all keys
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('active');
        key.style.removeProperty('--glow-intensity');
    });
    
    console.log("Note state reset");
}

// Touch tracking functions - optimized for multi-touch
export function trackTouch(touchId, noteId) {
    activeTouches.set(touchId, noteId);
}

export function untouchNote(touchId) {
    if (activeTouches.has(touchId)) {
        const noteId = activeTouches.get(touchId);
        stopNote(noteId);
        activeTouches.delete(touchId);
        return true;
    }
    return false;
}

export function getTouchedNote(touchId) {
    return activeTouches.get(touchId);
}

export function hasTouchId(touchId) {
    return activeTouches.has(touchId);
}

// Toggle performance mode
export function setPerformanceMode(enabled) {
    performanceMode = enabled;
    console.log("Performance mode:", performanceMode ? "enabled" : "disabled");
}

// Export for audio engine to use
export function stopAllNotes() {
    console.log("Stop all notes called");
    stopAllActive(true);
    resetNoteState();
}