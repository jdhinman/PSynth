// Preset management for PocketSynth

// Default presets
const DEFAULT_PRESETS = {
    init: {
        waveform: 'sine',
        volume: 0.8,
        filter: 0.7,
        attack: 0.05,
        release: 0.2,
        reverb: 0.3,
        delay: 0.3,
        detune: 0,
        scale: 'chromatic',
        key: 'C',
        chordMode: 'off'
    },
    bass: {
        waveform: 'sawtooth',
        volume: 0.75,
        filter: 0.4,
        attack: 0.02,
        release: 0.1,
        reverb: 0.1,
        delay: 0.0,
        detune: 10,
        scale: 'chromatic',
        key: 'C',
        chordMode: 'off'
    },
    pad: {
        waveform: 'sine',
        volume: 0.65,
        filter: 0.4,
        attack: 0.8,
        release: 1.5,
        reverb: 0.7,
        delay: 0.4,
        detune: 8,
        scale: 'major',
        key: 'C',
        chordMode: 'triad'
    },
    lead: {
        waveform: 'sawtooth',
        volume: 0.7,
        filter: 0.8,
        attack: 0.01,
        release: 0.1,
        reverb: 0.3,
        delay: 0.3,
        detune: 0,
        scale: 'pentatonic',
        key: 'C',
        chordMode: 'off'
    },
    pluck: {
        waveform: 'triangle',
        volume: 0.7,
        filter: 0.6,
        attack: 0.01,
        release: 0.3,
        reverb: 0.2,
        delay: 0.2,
        detune: 0,
        scale: 'chromatic',
        key: 'C',
        chordMode: 'off'
    }
};

// Save custom preset to localStorage
export function savePreset(name, settings) {
    try {
        // Get existing presets or initialize
        const savedPresets = getCustomPresets();
        
        // Add or update preset
        savedPresets[name] = settings;
        
        // Save to localStorage
        localStorage.setItem('pocketSynthPresets', JSON.stringify(savedPresets));
        console.log(`Preset "${name}" saved`);
        
        return true;
    } catch (error) {
        console.error('Error saving preset:', error);
        return false;
    }
}

// Load preset (either default or custom)
export function loadPreset(name) {
    try {
        // Try to get from built-in presets first
        if (DEFAULT_PRESETS[name]) {
            console.log(`Loading built-in preset "${name}"`);
            return DEFAULT_PRESETS[name];
        }
        
        // Try to get from custom presets
        const savedPresets = getCustomPresets();
        if (savedPresets[name]) {
            console.log(`Loading custom preset "${name}"`);
            return savedPresets[name];
        }
        
        console.error(`Preset "${name}" not found`);
        return null;
    } catch (error) {
        console.error('Error loading preset:', error);
        return null;
    }
}

// Get the current synth settings
export function getCurrentSettings(uiElements) {
    const settings = {};
    
    // Collect values from UI elements
    settings.waveform = uiElements.waveform.value;
    settings.volume = parseFloat(uiElements.volume.value);
    settings.filter = parseFloat(uiElements.filter.value);
    settings.attack = parseFloat(uiElements.attack.value);
    settings.release = parseFloat(uiElements.release.value);
    settings.reverb = parseFloat(uiElements.reverb.value);
    settings.delay = parseFloat(uiElements.delay.value);
    settings.detune = parseInt(uiElements.detune.value);
    settings.scale = uiElements.scale.value;
    settings.key = uiElements.key.value;
    settings.chordMode = uiElements.chordMode.value;
    
    return settings;
}

// Apply settings to UI elements
export function applySettings(settings, uiElements, updateFunctions) {
    if (!settings) return false;
    
    // Update UI elements
    if (settings.waveform) uiElements.waveform.value = settings.waveform;
    if (settings.volume !== undefined) uiElements.volume.value = settings.volume;
    if (settings.filter !== undefined) uiElements.filter.value = settings.filter;
    if (settings.attack !== undefined) uiElements.attack.value = settings.attack;
    if (settings.release !== undefined) uiElements.release.value = settings.release;
    if (settings.reverb !== undefined) uiElements.reverb.value = settings.reverb;
    if (settings.delay !== undefined) uiElements.delay.value = settings.delay;
    if (settings.detune !== undefined) uiElements.detune.value = settings.detune;
    if (settings.scale) uiElements.scale.value = settings.scale;
    if (settings.key && uiElements.key) uiElements.key.value = settings.key;
    if (settings.chordMode) uiElements.chordMode.value = settings.chordMode;
    
    // Call update functions with new values
    if (updateFunctions.updateVolume && settings.volume !== undefined) {
        updateFunctions.updateVolume(settings.volume);
    }
    
    if (updateFunctions.updateFilter && settings.filter !== undefined) {
        updateFunctions.updateFilter(settings.filter);
    }
    
    if (updateFunctions.updateReverb && settings.reverb !== undefined) {
        updateFunctions.updateReverb(settings.reverb);
    }
    
    if (updateFunctions.updateDelay && settings.delay !== undefined) {
        updateFunctions.updateDelay(settings.delay);
    }
    
    // Update display values
    if (uiElements.volumeDisplay && settings.volume !== undefined) {
        uiElements.volumeDisplay.textContent = `${Math.round(settings.volume * 100)}%`;
    }
    
    if (uiElements.filterDisplay && settings.filter !== undefined) {
        uiElements.filterDisplay.textContent = `${Math.round(settings.filter * 100)}%`;
    }
    
    if (uiElements.attackDisplay && settings.attack !== undefined) {
        uiElements.attackDisplay.textContent = `${Math.round(settings.attack * 1000)}ms`;
    }
    
    if (uiElements.releaseDisplay && settings.release !== undefined) {
        uiElements.releaseDisplay.textContent = `${Math.round(settings.release * 1000)}ms`;
    }
    
    if (uiElements.reverbDisplay && settings.reverb !== undefined) {
        uiElements.reverbDisplay.textContent = `${Math.round(settings.reverb * 100)}%`;
    }
    
    if (uiElements.delayDisplay && settings.delay !== undefined) {
        uiElements.delayDisplay.textContent = `${Math.round(settings.delay * 1000)}ms`;
    }
    
    if (uiElements.detuneDisplay && settings.detune !== undefined) {
        uiElements.detuneDisplay.textContent = `${settings.detune} cents`;
    }
    
    // Apply scale and key to the keyboard
    if (settings.scale) {
        import('./keyboardInterface.js').then(module => {
            module.applyScale(settings.scale, settings.key || 'C');
        });
    }
    
    console.log('Settings applied to UI');
    return true;
}

// Get list of custom presets
export function getCustomPresets() {
    try {
        const savedPresets = localStorage.getItem('pocketSynthPresets');
        return savedPresets ? JSON.parse(savedPresets) : {};
    } catch (error) {
        console.error('Error getting custom presets:', error);
        return {};
    }
}

// Get all available presets (default + custom)
export function getAllPresets() {
    return { ...DEFAULT_PRESETS, ...getCustomPresets() };
}

// Update preset select dropdown with all available presets
export function updatePresetSelectOptions() {
    try {
        const presetSelect = document.getElementById('preset-select');
        if (!presetSelect) return;
        
        // Clear existing options (except the first placeholder)
        while (presetSelect.options.length > 1) {
            presetSelect.remove(1);
        }
        
        // Add default presets first
        Object.keys(DEFAULT_PRESETS).forEach(presetName => {
            const option = document.createElement('option');
            option.value = presetName;
            option.textContent = presetName.charAt(0).toUpperCase() + presetName.slice(1);
            presetSelect.appendChild(option);
        });
        
        // Add custom presets
        const customPresets = getCustomPresets();
        Object.keys(customPresets).forEach(presetName => {
            const option = document.createElement('option');
            option.value = presetName;
            option.textContent = `${presetName} (Custom)`;
            presetSelect.appendChild(option);
        });
        
        console.log('Preset select options updated');
    } catch (error) {
        console.error('Error updating preset options:', error);
    }
}