// Audio processing and Web Audio API functionality
import { updateControlDisplays } from './uiControls.js';
import { resetNoteState } from './noteProcessor.js';
import { stopVisualizer } from './visualizer.js';

// Audio context and nodes
let audioContext;
let masterGainNode;
let reverbNode;
let delayNode;
let filterNode;
let dryGain, wetGain, delayFeedback;

// Current detune value
let detuneAmount = 0;

// Initialize the audio context on user interaction
export async function initAudio() {
    if (!audioContext) {
        try {
            // Create audio context with low latency settings where possible
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const options = {
                latencyHint: 'interactive',
                sampleRate: 44100
            };
            audioContext = new AudioContext(options);
            console.log("Audio context created with state:", audioContext.state);
            
            // Create master gain node
            masterGainNode = audioContext.createGain();
            masterGainNode.gain.value = parseFloat(document.getElementById('volume').value);
            
            // Create filter node
            filterNode = audioContext.createBiquadFilter();
            filterNode.type = "lowpass";
            
            // Set initial filter frequency based on slider
            const minValue = 50;
            const maxValue = 15000;
            const filterValue = parseFloat(document.getElementById('filter').value);
            const scaledValue = minValue * Math.pow(maxValue/minValue, filterValue);
            filterNode.frequency.value = scaledValue;
            filterNode.Q.value = 1;
            
            // Create convolver for reverb
            reverbNode = audioContext.createConvolver();
            const buffer = await createReverbImpulse();
            reverbNode.buffer = buffer;
            console.log("Reverb impulse response created");
            
            // Create delay node
            delayNode = audioContext.createDelay(5.0);
            delayNode.delayTime.value = parseFloat(document.getElementById('delay').value) || 0.3;
            
            // Feedback for delay
            delayFeedback = audioContext.createGain();
            delayFeedback.gain.value = 0.4;
            
            // Create dry/wet nodes for effects
            dryGain = audioContext.createGain();
            wetGain = audioContext.createGain();
            dryGain.gain.value = 0.7;
            wetGain.gain.value = parseFloat(document.getElementById('reverb').value);
            
            // Connect the audio graph - OPTIMIZED FOR PERFORMANCE
            masterGainNode.connect(filterNode);
            
            // Simplified routing with parallel paths
            filterNode.connect(dryGain);
            dryGain.connect(audioContext.destination);
            
            filterNode.connect(delayNode);
            delayNode.connect(delayFeedback);
            delayFeedback.connect(delayNode);
            delayNode.connect(audioContext.destination);
            
            filterNode.connect(reverbNode);
            reverbNode.connect(wetGain);
            wetGain.connect(audioContext.destination);
            
            // Resume audio context
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
                console.log("AudioContext resumed successfully");
            }
            
            // Set initial detune value
            detuneAmount = parseInt(document.getElementById('detune').value) || 0;
            
            console.log("Audio initialized successfully");
            updateControlDisplays();
            
            return audioContext;
        } catch (e) {
            console.error("Web Audio API initialization error:", e);
            alert("Could not initialize audio. Please try a different browser.");
            return null;
        }
    }
    
    // If context exists but is suspended, resume it
    if (audioContext && audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
            console.log("AudioContext resumed from suspended state");
        } catch (e) {
            console.error("Error resuming audio context:", e);
        }
    }
    
    return audioContext;
}

// Create reverb impulse response - optimized for performance
async function createReverbImpulse() {
    if (!audioContext) return null;
    
    const sampleRate = audioContext.sampleRate;
    const length = 1.5 * sampleRate; // 1.5 seconds (shorter for better performance)
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    
    // Create a more efficient decay pattern
    for (let channel = 0; channel < 2; channel++) {
        const impulseData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            // Faster calculation for decay
            const decay = Math.exp(-i / (sampleRate * 0.5));
            impulseData[i] = (Math.random() * 2 - 1) * decay;
        }
    }
    
    return impulse;
}

// More efficient oscillator creation with reduced latency
export function createOscillator(frequency, type) {
    if (!audioContext) {
        console.error("Audio context not available in createOscillator");
        return null;
    }
    
    try {
        // Skip detune for better performance if value is minimal
        if (detuneAmount <= 2) {
            const osc = audioContext.createOscillator();
            osc.type = type || 'sine';
            osc.frequency.value = frequency; // Direct assignment for lower latency
            
            // Add a limiter to prevent distortion when playing multiple notes
            // especially in lower registers
            const limiter = audioContext.createWaveShaper();
            limiter.curve = createDistortionCurve(0.7); // Soft clipping
            
            // Store the limiter for connection
            osc.limiter = limiter;
            
            // Override connect method to include the limiter
            const originalConnect = osc.connect;
            osc.connect = function(destination) {
                originalConnect.call(this, limiter);
                limiter.connect(destination);
                return destination;
            };
            
            return osc;
        }
        
        // For detuned oscillators, ensure they don't cause distortion
        const oscillatorCount = 2; // Reduced from 3 for better performance
        const oscillators = [];
        const mixGain = audioContext.createGain();
        // Lower gain for multiple oscillators to prevent distortion
        mixGain.gain.value = 0.8 / oscillatorCount;
        
        // Create a limiter for the mixed output
        const limiter = audioContext.createWaveShaper();
        limiter.curve = createDistortionCurve(0.7);
        
        // Create oscillators with more direct parameter settings
        for (let i = 0; i < oscillatorCount; i++) {
            const osc = audioContext.createOscillator();
            osc.type = type || 'sine';
            osc.frequency.value = frequency;
            
            // Only detune the second oscillator
            if (i === 1) {
                // Use smaller detune value for less distortion
                osc.detune.value = Math.min(detuneAmount, 20);
            }
            
            // Connect to mix gain
            osc.connect(mixGain);
            oscillators.push(osc);
        }
        
        // Start oscillators
        oscillators.forEach(osc => osc.start());
        
        // Store reference and simplify cleanup
        const mainOsc = oscillators[0];
        mainOsc.mixGain = mixGain;
        mainOsc.limiter = limiter;
        mainOsc.detunedOscs = oscillators.slice(1);
        
        // Override connect method to include limiter
        mainOsc.connect = function(destination) {
            mixGain.connect(limiter);
            limiter.connect(destination);
            return destination;
        };
        
        mainOsc.stop = function(when) {
            oscillators.forEach(osc => {
                try {
                    osc.stop(when);
                } catch(e) {
                    console.warn("Error stopping oscillator:", e);
                }
            });
        };
        
        return mainOsc;
    } catch (e) {
        console.error("Error creating oscillator:", e);
        return null;
    }
}

// Add a waveshaper curve to prevent distortion
function createDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        // Soft clipping function
        curve[i] = (3 + k) * x * 0.5 * (1 - Math.abs(x) * 0.3) / (3 + k * Math.abs(x));
    }
    
    return curve;
}

// Update detune amount
export function updateDetune(value) {
    detuneAmount = value;
    console.log("Detune updated:", value, "cents");
}

// Exports for other modules
export function getAudioContext() {
    return audioContext;
}

export function getMasterGainNode() {
    return masterGainNode;
}

export function getFilterNode() {
    return filterNode;
}

export function getDelayNode() {
    return delayNode;
}

export function getReverbNode() {
    return reverbNode;
}

export function getWetGain() {
    return wetGain;
}

export function getDryGain() {
    return dryGain;
}

// Update effect settings - optimized for smoother transitions
export function updateReverb(value) {
    if (wetGain) {
        const now = audioContext.currentTime;
        wetGain.gain.cancelScheduledValues(now);
        wetGain.gain.setValueAtTime(wetGain.gain.value, now);
        wetGain.gain.linearRampToValueAtTime(value, now + 0.05);
        console.log("Reverb updated:", value);
    }
}

export function updateDelay(value) {
    if (delayNode) {
        const now = audioContext.currentTime;
        delayNode.delayTime.cancelScheduledValues(now);
        delayNode.delayTime.setValueAtTime(delayNode.delayTime.value, now);
        delayNode.delayTime.linearRampToValueAtTime(value, now + 0.05);
        console.log("Delay updated:", value);
    }
}

export function updateFilter(value) {
    if (filterNode) {
        // Exponential scale for more natural frequency control
        const minValue = 50;
        const maxValue = 15000;
        const scaledValue = minValue * Math.pow(maxValue/minValue, value);
        
        const now = audioContext.currentTime;
        filterNode.frequency.cancelScheduledValues(now);
        filterNode.frequency.setValueAtTime(filterNode.frequency.value, now);
        filterNode.frequency.exponentialRampToValueAtTime(scaledValue, now + 0.05);
        console.log("Filter updated:", scaledValue, "Hz");
    }
}

export function updateVolume(value) {
    if (masterGainNode) {
        const now = audioContext.currentTime;
        masterGainNode.gain.cancelScheduledValues(now);
        masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, now);
        masterGainNode.gain.linearRampToValueAtTime(value, now + 0.05);
        console.log("Volume updated:", value);
    }
}

// Completely revamped Stop All Notes function for immediate silencing
export function stopAllNotes() {
    try {
        console.log("Emergency sound stop - IMMEDIATE");
        
        if (!audioContext) return;
        
        // STAGE 1: Cut all audio at master gain level IMMEDIATELY
        if (masterGainNode) {
            const now = audioContext.currentTime;
            masterGainNode.gain.cancelScheduledValues(now);
            masterGainNode.gain.setValueAtTime(0, now);
        }
        
        // STAGE 2: Force stop all active oscillators
        import('./noteProcessor.js').then(module => {
            // First attempt normal stop
            module.stopAllActive(true); // true means immediate
            
            // Then directly access and force-stop any remaining oscillators
            const activeOscs = module.getActiveOscillators();
            if (activeOscs) {
                Object.values(activeOscs).forEach(osc => {
                    try {
                        if (osc) osc.stop(0);
                        
                        // Handle any detuned oscillators
                        if (osc.detunedOscs) {
                            osc.detunedOscs.forEach(detuned => {
                                try {
                                    if (detuned) detuned.stop(0);
                                } catch (e) {}
                            });
                        }
                    } catch (e) {}
                });
            }
            
            // Clear all oscillator references
            module.resetNoteState();
        });
        
        // STAGE 3: Remove active visual state from all keys
        document.querySelectorAll('.key.active').forEach(key => {
            key.classList.remove('active');
            key.style.removeProperty('--glow-intensity');
        });
        
        // Do NOT restore volume automatically - this was causing sounds to resume
        // Instead, only restore after complete recreation of audio state
        
        // STAGE 4: Force a complete reset of audio context if needed
        const startingOver = async () => {
            console.log("Completely resetting audio system");
            
            // Stop visualizer
            import('./visualizer.js').then(module => {
                if (module.stopVisualizer) {
                    module.stopVisualizer();
                }
            });
            
            // Close current audio context
            if (audioContext) {
                try {
                    await audioContext.close();
                } catch (e) {
                    console.error("Error closing audio context:", e);
                }
                
                audioContext = null;
                masterGainNode = null;
                reverbNode = null;
                delayNode = null;
                filterNode = null;
                dryGain = null;
                wetGain = null;
                delayFeedback = null;
                
                // Reinitialize after context is closed
                setTimeout(async () => {
                    await initAudio();
                    
                    // Now restore the volume
                    if (masterGainNode && audioContext) {
                        const volume = parseFloat(document.getElementById('volume').value);
                        masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                        
                        // Reinitialize visualizer
                        import('./visualizer.js').then(module => {
                            if (module.initVisualizer && module.resizeVisualizer) {
                                module.initVisualizer(audioContext, masterGainNode);
                                module.resizeVisualizer();
                            }
                        });
                    }
                }, 200);
            }
        };
        
        // Always do a full reset to ensure sounds are stopped
        startingOver();
        
    } catch (e) {
        console.error("Critical error in stopAllNotes:", e);
        alert("Audio system error. Try refreshing the page.");
    }
}