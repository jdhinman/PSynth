// Music scales and related utilities

// Scale patterns (intervals from root)
const SCALE_PATTERNS = {
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    blues: [0, 3, 5, 6, 7, 10]
};

// Root notes for key selection
export const ROOT_NOTES = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

// Chord patterns (intervals from root)
const CHORD_PATTERNS = {
    triad: [0, 4, 7],
    minor: [0, 3, 7],
    power: [0, 7, 12],
    seventh: [0, 4, 7, 10]
};

// Scale-specific chord degrees (positions in the scale pattern)
const SCALE_CHORD_DEGREES = {
    major: {
        triad: [
            [0, 2, 4],
            [1, 3, 5],
            [2, 4, 6],
            [3, 5, 0],
            [4, 6, 1],
            [5, 0, 2],
            [6, 1, 3]
        ],
        seventh: [
            [0, 2, 4, 6],
            [1, 3, 5, 0],
            [2, 4, 6, 1],
            [3, 5, 0, 2],
            [4, 6, 1, 3],
            [5, 0, 2, 4],
            [6, 1, 3, 5]
        ]
    },
    minor: {
        triad: [
            [0, 2, 4],
            [1, 3, 5],
            [2, 4, 6],
            [3, 5, 0],
            [4, 6, 1],
            [5, 0, 2],
            [6, 1, 3]
        ],
        seventh: [
            [0, 2, 4, 6],
            [1, 3, 5, 0],
            [2, 4, 6, 1],
            [3, 5, 0, 2],
            [4, 6, 1, 3],
            [5, 0, 2, 4],
            [6, 1, 3, 5]
        ]
    },
    pentatonic: {
        triad: [
            [0, 1, 2],
            [1, 2, 3],
            [2, 3, 4],
            [3, 4, 0],
            [4, 0, 1]
        ],
        seventh: [
            [0, 1, 2, 3],
            [1, 2, 3, 4],
            [2, 3, 4, 0],
            [3, 4, 0, 1],
            [4, 0, 1, 2]
        ]
    },
    blues: {
        triad: [
            [0, 2, 3],
            [1, 3, 4],
            [2, 4, 5],
            [3, 5, 0],
            [4, 0, 1],
            [5, 1, 2]
        ],
        seventh: [
            [0, 2, 3, 5],
            [1, 3, 4, 0],
            [2, 4, 5, 1],
            [3, 5, 0, 2],
            [4, 0, 1, 3],
            [5, 1, 2, 4]
        ]
    }
};

// Determine if a note is in the current scale
export function isNoteInScale(noteNumber, scaleType, rootNote = 0) {
    if (scaleType === 'chromatic') return true;
    
    const pattern = SCALE_PATTERNS[scaleType] || SCALE_PATTERNS.chromatic;
    const noteInScale = (noteNumber - rootNote) % 12;
    
    return pattern.includes(noteInScale >= 0 ? noteInScale : noteInScale + 12);
}

// Get chord notes from a root note
export function getChordNotes(rootNoteFrequency, chordType, scaleType = 'chromatic', rootNoteNumber = null) {
    if (chordType === 'off') return [rootNoteFrequency];
    
    if (!scaleType || scaleType === 'chromatic') {
        const pattern = CHORD_PATTERNS[chordType] || CHORD_PATTERNS.triad;
        
        return pattern.map(semitones => {
            return rootNoteFrequency * Math.pow(2, semitones / 12);
        });
    }
    
    if (rootNoteNumber === null) {
        return CHORD_PATTERNS[chordType].map(semitones => 
            rootNoteFrequency * Math.pow(2, semitones / 12)
        );
    }
    
    const pattern = SCALE_PATTERNS[scaleType] || SCALE_PATTERNS.chromatic;
    const rootNotePosition = pattern.indexOf(rootNoteNumber % 12);
    
    if (rootNotePosition === -1) {
        return CHORD_PATTERNS[chordType].map(semitones => 
            rootNoteFrequency * Math.pow(2, semitones / 12)
        );
    }
    
    const scaleChords = SCALE_CHORD_DEGREES[scaleType] || SCALE_CHORD_DEGREES.major;
    const chordDegrees = scaleChords[chordType] || scaleChords.triad;
    
    const chordToUse = chordDegrees[rootNotePosition] || chordDegrees[0];
    
    const semitones = chordToUse.map(degree => {
        const patternIndex = (rootNotePosition + degree) % pattern.length;
        const octaveShift = Math.floor((rootNotePosition + degree) / pattern.length);
        
        const semitone = (pattern[patternIndex] - pattern[rootNotePosition] + 12) % 12;
        return semitone + (octaveShift * 12);
    });
    
    return semitones.map(semitone => 
        rootNoteFrequency * Math.pow(2, semitone / 12)
    );
}

// Get note number from note name (e.g., C4 -> 60)
export function getNoteNumber(noteName) {
    const noteMap = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 
        'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    
    const match = noteName.match(/([A-G][#b]?)(\d+)/);
    if (!match) return null;
    
    const [, note, octave] = match;
    const noteIndex = noteMap[note];
    
    return noteIndex + (parseInt(octave) + 1) * 12;
}

// Get note name from MIDI note number
export function getNoteName(noteNumber) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    const note = noteNames[noteNumber % 12];
    
    return `${note}${octave}`;
}

// Get note frequency from MIDI note number
export function getNoteFrequency(noteNumber) {
    return 440 * Math.pow(2, (noteNumber - 69) / 12);
}

// Get all notes for an octave based on scale and root
export function getScaleNotes(startNote, scaleType, rootKey = 'C') {
    const startNoteNumber = getNoteNumber(startNote);
    const rootOffset = ROOT_NOTES.indexOf(rootKey);
    const result = [];
    
    for (let i = 0; i < 12; i++) {
        const noteNumber = startNoteNumber + i;
        const noteName = getNoteName(noteNumber);
        const frequency = getNoteFrequency(noteNumber);
        
        result.push({
            name: noteName,
            number: noteNumber,
            frequency: frequency,
            inScale: isNoteInScale((noteNumber - rootOffset) % 12, scaleType)
        });
    }
    
    return result;
}

// Export scale patterns for UI display
export function getScaleNames() {
    return Object.keys(SCALE_PATTERNS);
}

// Export chord patterns for UI display
export function getChordTypes() {
    return Object.keys(CHORD_PATTERNS);
}