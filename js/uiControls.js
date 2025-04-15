// UI controls and interface management
import { 
    getAudioContext, 
    updateFilter,
    updateDelay,
    updateReverb,
    updateVolume,
    updateDetune,
    stopAllNotes
} from './audioEngine.js';

import { 
    loadPreset, 
    savePreset, 
    getCurrentSettings, 
    applySettings, 
    updatePresetSelectOptions 
} from './presets.js';

import { resetNoteState } from './noteProcessor.js';
import { initKeyboard } from './keyboardInterface.js';
import { resizeVisualizer } from './visualizer.js';

// Current octave (updated by octave shifter)
let currentOctave = 4;

// Setup control handlers for the synth
export function setupUIControls() {
    setupTabs();
    setupHelpPanel();
    setupControlHandlers();
    setupOctaveShifter();
    setupPresetControls();
    setupScaleAndChordMode();
    
    // Initialize keyboard with current octave
    initKeyboard(currentOctave);
    
    // Setup window resize for visualizer
    window.addEventListener('resize', function() {
        resizeVisualizer();
    });
    
    console.log("UI controls setup complete");
}

// Setup handlers for all control elements
function setupControlHandlers() {
    // Volume control
    document.getElementById('volume').addEventListener('input', e => {
        const value = parseFloat(e.target.value);
        updateVolume(value);
        
        const valueDisplay = e.target.nextElementSibling;
        valueDisplay.textContent = `${Math.round(value * 100)}%`;
        highlightLabel(e.target);
    });
    
    // Reverb control
    document.getElementById('reverb').addEventListener('input', e => {
        const value = parseFloat(e.target.value);
        updateReverb(value);
        
        const valueDisplay = e.target.nextElementSibling;
        valueDisplay.textContent = `${Math.round(value * 100)}%`;
        highlightLabel(e.target);
    });
    
    // Delay control
    document.getElementById('delay').addEventListener('input', e => {
        const value = parseFloat(e.target.value);
        updateDelay(value);
        
        const valueDisplay = e.target.nextElementSibling;
        valueDisplay.textContent = `${Math.round(value * 1000)}ms`;
        highlightLabel(e.target);
    });
    
    // Filter control
    document.getElementById('filter').addEventListener('input', e => {
        const value = parseFloat(e.target.value);
        updateFilter(value);
        
        const valueDisplay = e.target.nextElementSibling;
        valueDisplay.textContent = `${Math.round(value * 100)}%`;
        highlightLabel(e.target);
    });
    
    // Attack control
    document.getElementById('attack').addEventListener('input', e => {
        const valueDisplay = e.target.nextElementSibling;
        valueDisplay.textContent = `${Math.round(e.target.value * 1000)}ms`;
        highlightLabel(e.target);
    });
    
    // Release control
    document.getElementById('release').addEventListener('input', e => {
        const valueDisplay = e.target.nextElementSibling;
        valueDisplay.textContent = `${Math.round(e.target.value * 1000)}ms`;
        highlightLabel(e.target);
    });
    
    // Detune control
    document.getElementById('detune').addEventListener('input', e => {
        const value = parseInt(e.target.value);
        updateDetune(value);
        
        const valueDisplay = e.target.nextElementSibling;
        valueDisplay.textContent = `${value} cents`;
        highlightLabel(e.target);
    });
    
    // Handle waveform changes
    document.getElementById('waveform').addEventListener('change', function(e) {
        // Update any active oscillators immediately
        import('./noteProcessor.js').then(module => {
            const activeOscillators = module.getActiveOscillators();
            if (activeOscillators) {
                Object.values(activeOscillators).forEach(osc => {
                    if (osc) {
                        osc.type = this.value;
                    }
                });
            }
        });
        
        highlightLabel(this);
    });
    
    console.log("Control handlers setup complete");
}

// Tab switching functionality
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const panels = document.querySelectorAll('.controls-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and hide all panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            panels.forEach(panel => panel.classList.add('hidden'));
            
            // Add active class to clicked button and show corresponding panel
            button.classList.add('active');
            const targetTab = button.getAttribute('data-tab');
            document.getElementById(`${targetTab}-panel`).classList.remove('hidden');
        });
    });
    
    console.log("Tab controls setup complete");
}

// Help panel controls
function setupHelpPanel() {
    const helpButton = document.getElementById('help-button');
    const helpSection = document.getElementById('help-section');
    const closeHelpButton = document.getElementById('close-help');
    const helpTabButtons = document.querySelectorAll('.help-tab-button');
    const helpPanels = document.querySelectorAll('.help-panel');
    
    // Toggle help section visibility
    helpButton.addEventListener('click', () => {
        helpSection.classList.toggle('hidden');
        helpSection.classList.toggle('active');
    });
    
    // Close help section
    closeHelpButton.addEventListener('click', () => {
        helpSection.classList.add('hidden');
        helpSection.classList.remove('active');
    });
    
    // Help tab switching
    helpTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and hide all panels
            helpTabButtons.forEach(btn => btn.classList.remove('active'));
            helpPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked button and show corresponding panel
            button.classList.add('active');
            const targetTab = button.getAttribute('data-help-tab');
            document.getElementById(`${targetTab}-panel`).classList.add('active');
        });
    });
    
    console.log("Help panel controls setup complete");
}

// Octave shifter functionality
function setupOctaveShifter() {
    const octaveDownButton = document.getElementById('octave-down');
    const octaveUpButton = document.getElementById('octave-up');
    const octaveDisplay = document.getElementById('octave-display');
    
    // Update octave display
    const updateOctaveDisplay = () => {
        octaveDisplay.textContent = `C${currentOctave}-C${currentOctave+1}`;
    };
    
    // Shift octave down
    octaveDownButton.addEventListener('click', () => {
        if (currentOctave > 1) {
            currentOctave--;
            stopAllNotes();
            resetNoteState();
            initKeyboard(currentOctave);
            updateOctaveDisplay();
        }
    });
    
    // Shift octave up
    octaveUpButton.addEventListener('click', () => {
        if (currentOctave < 7) {
            currentOctave++;
            stopAllNotes();
            resetNoteState();
            initKeyboard(currentOctave);
            updateOctaveDisplay();
        }
    });
    
    updateOctaveDisplay();
    console.log("Octave shifter setup complete");
}

// Preset system functionality
function setupPresetControls() {
    const presetSelect = document.getElementById('preset-select');
    const savePresetButton = document.getElementById('save-preset');
    
    // Load preset when selected
    presetSelect.addEventListener('change', () => {
        const presetName = presetSelect.value;
        if (!presetName) return;
        
        const settings = loadPreset(presetName);
        if (settings) {
            const uiElements = getUIElements();
            const updateFunctions = {
                updateVolume,
                updateFilter,
                updateReverb,
                updateDelay,
                updateDetune
            };
            
            applySettings(settings, uiElements, updateFunctions);
            
            // Update scale and apply it to the keyboard
            if (settings.scale) {
                import('./keyboardInterface.js').then(module => {
                    module.applyScale(settings.scale);
                });
            }
            
            // Reset select to placeholder after loading
            setTimeout(() => {
                presetSelect.value = '';
            }, 300);
        }
    });
    
    // Save current settings as preset
    savePresetButton.addEventListener('click', () => {
        const presetName = prompt('Enter a name for your preset:');
        if (!presetName) return;
        
        const uiElements = getUIElements();
        const settings = getCurrentSettings(uiElements);
        
        if (savePreset(presetName, settings)) {
            alert(`Preset "${presetName}" saved successfully!`);
            updatePresetSelectOptions();
        } else {
            alert('Failed to save preset. Please try again.');
        }
    });
    
    // Initialize preset select options
    updatePresetSelectOptions();
    console.log("Preset controls setup complete");
}

// Setup scale and chord mode controls
function setupScaleAndChordMode() {
    const scaleSelect = document.getElementById('scale');
    const chordModeSelect = document.getElementById('chord-mode');
    const keySelect = document.getElementById('key');
    
    // Apply scale when selected
    scaleSelect.addEventListener('change', () => {
        const currentKey = document.getElementById('key').value || 'C';
        import('./keyboardInterface.js').then(module => {
            module.applyScale(scaleSelect.value, currentKey);
        });
        highlightLabel(scaleSelect);
    });
    
    // Apply key when selected
    if (keySelect) {
        keySelect.addEventListener('change', () => {
            const currentScale = document.getElementById('scale').value;
            import('./keyboardInterface.js').then(module => {
                module.applyScale(currentScale, keySelect.value);
            });
            highlightLabel(keySelect);
        });
    }
    
    // Apply chord mode when selected
    chordModeSelect.addEventListener('change', () => {
        highlightLabel(chordModeSelect);
    });
    
    console.log("Scale and chord mode controls setup complete");
}

// Get all UI control elements for preset management
function getUIElements() {
    return {
        waveform: document.getElementById('waveform'),
        volume: document.getElementById('volume'),
        filter: document.getElementById('filter'),
        attack: document.getElementById('attack'),
        release: document.getElementById('release'),
        reverb: document.getElementById('reverb'),
        delay: document.getElementById('delay'),
        detune: document.getElementById('detune'),
        scale: document.getElementById('scale'),
        key: document.getElementById('key'), 
        chordMode: document.getElementById('chord-mode'),
        volumeDisplay: document.querySelector('#volume + .value-display'),
        filterDisplay: document.querySelector('#filter + .value-display'),
        attackDisplay: document.querySelector('#attack + .value-display'),
        releaseDisplay: document.querySelector('#release + .value-display'),
        reverbDisplay: document.querySelector('#reverb + .value-display'),
        delayDisplay: document.querySelector('#delay + .value-display'),
        detuneDisplay: document.querySelector('#detune + .value-display')
    };
}

// Update all control displays with current values
export function updateControlDisplays() {
    const volumeControl = document.getElementById('volume');
    const volumeDisplay = volumeControl.nextElementSibling;
    volumeDisplay.textContent = `${Math.round(volumeControl.value * 100)}%`;
    
    const filterControl = document.getElementById('filter');
    const filterDisplay = filterControl.nextElementSibling;
    filterDisplay.textContent = `${Math.round(filterControl.value * 100)}%`;
    
    const attackControl = document.getElementById('attack');
    const attackDisplay = attackControl.nextElementSibling;
    attackDisplay.textContent = `${Math.round(attackControl.value * 1000)}ms`;
    
    const releaseControl = document.getElementById('release');
    const releaseDisplay = releaseControl.nextElementSibling;
    releaseDisplay.textContent = `${Math.round(releaseControl.value * 1000)}ms`;
    
    const reverbControl = document.getElementById('reverb');
    const reverbDisplay = reverbControl.nextElementSibling;
    reverbDisplay.textContent = `${Math.round(reverbControl.value * 100)}%`;
    
    const delayControl = document.getElementById('delay');
    const delayDisplay = delayControl.nextElementSibling;
    delayDisplay.textContent = `${Math.round(delayControl.value * 1000)}ms`;
    
    const detuneControl = document.getElementById('detune');
    const detuneDisplay = detuneControl.nextElementSibling;
    detuneDisplay.textContent = `${detuneControl.value} cents`;
    
    console.log("Control displays updated");
}

// Visual feedback when changing controls
function highlightLabel(control) {
    const label = control.closest('.control-item').querySelector('label');
    label.classList.add('highlight');
    setTimeout(() => label.classList.remove('highlight'), 300);
}

// Get current octave for keyboard generation
export function getCurrentOctave() {
    return currentOctave;
}