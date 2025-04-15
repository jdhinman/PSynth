// Audio visualizer functionality

// Global variables for visualizer state
let visualizerCtx;
let visualizerCanvas;
let audioContext;
let analyser;
let dataArray;
let isVisualizerActive = false;
let animationFrame = null;

// Initialize the visualizer with audio context and input node
function initVisualizer(context, sourceNode) {
    if (!context || !sourceNode) {
        console.error("Cannot initialize visualizer - missing audio context or source node");
        return;
    }
    
    audioContext = context;
    visualizerCanvas = document.getElementById('visualizer');
    
    if (!visualizerCanvas) {
        console.error("Visualizer canvas not found");
        return;
    }
    
    visualizerCtx = visualizerCanvas.getContext('2d');
    
    // Create analyzer node
    try {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048; // Higher for smoother visualization
        sourceNode.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        // Start the visualizer animation
        isVisualizerActive = true;
        animateVisualizer();
        
        console.log("Visualizer initialized with buffer length:", bufferLength);
    } catch (e) {
        console.error("Error initializing visualizer:", e);
    }
}

// Resize the visualizer canvas to fit container
function resizeVisualizer() {
    if (!visualizerCanvas) return;
    
    const container = visualizerCanvas.parentElement;
    if (!container) return;
    
    // Set canvas dimensions to match container size
    visualizerCanvas.width = container.clientWidth;
    visualizerCanvas.height = container.clientHeight;
    
    console.log("Visualizer resized to", visualizerCanvas.width, "x", visualizerCanvas.height);
}

// Animate the visualizer
function animateVisualizer() {
    if (!isVisualizerActive) return;
    
    // Request next frame first for smoother animation
    animationFrame = requestAnimationFrame(animateVisualizer);
    
    if (!analyser || !visualizerCtx) return;
    
    // Get frequency data
    analyser.getByteTimeDomainData(dataArray);
    
    // Clear canvas
    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    
    // Draw waveform
    visualizerCtx.lineWidth = 2;
    visualizerCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--visualizer-color').trim() || '#5e35b1';
    visualizerCtx.beginPath();
    
    const sliceWidth = visualizerCanvas.width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
        // Scale to canvas height (128 is the centerline of the waveform)
        const v = dataArray[i] / 128.0;
        const y = v * visualizerCanvas.height / 2;
        
        if (i === 0) {
            visualizerCtx.moveTo(x, y);
        } else {
            visualizerCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    visualizerCtx.lineTo(visualizerCanvas.width, visualizerCanvas.height / 2);
    visualizerCtx.stroke();
}

// Clean up on destruction
function stopVisualizer() {
    isVisualizerActive = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    // Clear the visualizer canvas
    if (visualizerCtx && visualizerCanvas) {
        visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
    
    console.log("Visualizer stopped and cleared");
}

// Single export statement for all functions
export { initVisualizer, resizeVisualizer, stopVisualizer };