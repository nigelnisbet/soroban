import { useEffect, useRef, useState } from 'react';
import { Soroban } from '../soroban/Soroban';

// MediaPipe Hands will be loaded from CDN
declare const window: Window & {
  Hands?: any;
  Camera?: any;
};

export function HandTrackingDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [leftHandCount, setLeftHandCount] = useState(0);  // Tens place
  const [rightHandCount, setRightHandCount] = useState(0); // Ones place
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    let hands: any = null;
    let camera: any = null;

    const initializeMediaPipe = async () => {
      try {
        // Load MediaPipe scripts
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

        if (!window.Hands || !window.Camera) {
          throw new Error('MediaPipe libraries not loaded');
        }

        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
        if (!videoElement || !canvasElement) return;

        const canvasCtx = canvasElement.getContext('2d');
        if (!canvasCtx) return;

        // Initialize Hands
        hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results: any) => {
          // Clear canvas
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

          // Mirror the canvas horizontally
          canvasCtx.translate(canvasElement.width, 0);
          canvasCtx.scale(-1, 1);

          // Fill with dark background instead of video
          canvasCtx.fillStyle = '#1a1a2e';
          canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

          let leftCount = 0;
          let rightCount = 0;
          let debugText = '';

          if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
              const landmarks = results.multiHandLandmarks[i];
              const handedness = results.multiHandedness[i].label; // "Left" or "Right"

              // Draw hand landmarks
              drawConnectors(canvasCtx, landmarks, canvasElement);
              drawLandmarks(canvasCtx, landmarks, canvasElement);

              // Count fingers for this hand
              const fingers = countFingers(landmarks, handedness);

              // MediaPipe's labels are from camera perspective, so we need to flip them
              // When MediaPipe says "Right", it means the hand on the right of the CAMERA (your left hand)
              // When MediaPipe says "Left", it means the hand on the left of the CAMERA (your right hand)
              if (handedness === 'Right') {
                leftCount = fingers; // MediaPipe "Right" = your left hand = tens (left rod)
                debugText += `Left Hand (Tens): ${fingers} | `;
              } else {
                rightCount = fingers; // MediaPipe "Left" = your right hand = ones (right rod)
                debugText += `Right Hand (Ones): ${fingers}`;
              }
            }
          }

          setLeftHandCount(leftCount);
          setRightHandCount(rightCount);
          setDebugInfo(debugText || 'No hands detected');
          canvasCtx.restore();
        });

        // Start camera
        camera = new window.Camera(videoElement, {
          onFrame: async () => {
            if (hands) {
              await hands.send({ image: videoElement });
            }
          },
          width: 640,
          height: 480
        });

        await camera.start();
        setIsLoading(false);

      } catch (err) {
        console.error('MediaPipe initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize camera');
        setIsLoading(false);
      }
    };

    initializeMediaPipe();

    // Cleanup
    return () => {
      if (camera) {
        camera.stop();
      }
      if (hands) {
        hands.close();
      }
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 32,
      padding: 32,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <h1 style={{
        fontSize: 48,
        fontWeight: 'bold',
        color: 'white',
        textShadow: '0 4px 8px rgba(0,0,0,0.2)',
        margin: 0,
      }}>
        Hand Tracking Soroban
      </h1>

      {isLoading && (
        <div style={{ color: 'white', fontSize: 24 }}>
          Loading camera...
        </div>
      )}

      {error && (
        <div style={{
          color: 'white',
          fontSize: 18,
          background: 'rgba(255,0,0,0.3)',
          padding: 16,
          borderRadius: 8,
        }}>
          Error: {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: 32,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {/* Camera Feed */}
        <div style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <video
            ref={videoRef}
            style={{ display: 'none' }}
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            style={{
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
            }}
          />

          {/* Finger count overlay */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 20,
            fontWeight: 'bold',
          }}>
            <div>Left Hand (Tens): {leftHandCount}</div>
            <div>Right Hand (Ones): {rightHandCount}</div>
            <div style={{ marginTop: 4, fontSize: 28 }}>
              Total: {leftHandCount * 10 + rightHandCount}
            </div>
          </div>

          {debugInfo && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 14,
            }}>
              {debugInfo}
            </div>
          )}
        </div>

        {/* Soroban Display */}
        <div style={{
          background: 'white',
          padding: 32,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            marginBottom: 16,
            fontSize: 14,
            color: '#666',
            textAlign: 'center',
          }}>
            Left hand = Tens | Right hand = Ones
          </div>
          <Soroban
            rodCount={2}
            initialValue={leftHandCount * 10 + rightHandCount}
            size="large"
            disabled={true}
          />
        </div>
      </div>

      <div style={{
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
        maxWidth: 700,
        lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
          How to use:
        </div>
        <div>
          <strong>Left hand = Tens place</strong> | <strong>Right hand = Ones place</strong>
        </div>
        <div style={{ fontSize: 16, marginTop: 8 }}>
          Index=1, +Middle=2, +Ring=3, +Pinky=4, Thumb=5, Thumb+fingers=6-9
        </div>
      </div>
    </div>
  );
}

// Helper function to load scripts dynamically
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Count fingers using soroban-friendly system:
// Index = 1, Index+Middle = 2, Index+Middle+Ring = 3, Index+Middle+Ring+Pinky = 4
// Thumb = 5 (heaven bead!), Thumb+Index = 6, etc.
function countFingers(landmarks: any[], handedness: string): number {
  const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
  const fingerPIPs = [6, 10, 14, 18]; // PIP joints (second knuckle)
  const fingerMCPs = [5, 9, 13, 17]; // MCP joints (knuckles at base of fingers)
  const thumbTip = 4;
  const thumbIP = 3;
  const thumbMCP = 2; // Base of thumb

  // Check which fingers are extended
  const fingerStates = {
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  };

  // Check thumb (different logic for left/right hand)
  // Thumb is extended if tip is far from palm in the horizontal direction
  // TUNED: Lower threshold (0.025 instead of 0.05) makes it easier to detect thumb
  const thumbDistance = handedness === 'Right'
    ? landmarks[thumbTip].x - landmarks[thumbMCP].x
    : landmarks[thumbMCP].x - landmarks[thumbTip].x;

  fingerStates.thumb = thumbDistance > 0.025; // More sensitive thumb detection

  // Check other fingers (tip above PIP joint = extended)
  // For index, middle, ring: standard detection
  fingerStates.index = landmarks[fingerTips[0]].y < landmarks[fingerPIPs[0]].y;
  fingerStates.middle = landmarks[fingerTips[1]].y < landmarks[fingerPIPs[1]].y;
  fingerStates.ring = landmarks[fingerTips[2]].y < landmarks[fingerPIPs[2]].y;

  // TUNED: Pinky requires tip to be significantly higher (0.02 units) than PIP joint
  // This prevents partially-raised pinky from being counted as extended
  const pinkyTip = landmarks[fingerTips[3]];
  const pinkyPIP = landmarks[fingerPIPs[3]];
  const pinkyExtensionDistance = pinkyPIP.y - pinkyTip.y;
  fingerStates.pinky = pinkyExtensionDistance > 0.02; // Stricter pinky detection

  // Calculate count based on soroban rules:
  // Thumb alone = 5
  // Four fingers follow sequential pattern (must be in sequence from index)
  let count = 0;

  // Count the "earth beads" (1-4): only count sequential fingers starting from index
  let earthBeads = 0;
  if (fingerStates.index) {
    earthBeads = 1;
    if (fingerStates.middle) {
      earthBeads = 2;
      if (fingerStates.ring) {
        earthBeads = 3;
        if (fingerStates.pinky) {
          earthBeads = 4;
        }
      }
    }
  }

  // Add "heaven bead" (5)
  const heavenBead = fingerStates.thumb ? 5 : 0;

  count = earthBeads + heavenBead;

  return count;
}

// Draw hand landmarks
function drawLandmarks(ctx: CanvasRenderingContext2D, landmarks: any[], canvas: HTMLCanvasElement) {
  for (const landmark of landmarks) {
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#00FF00';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// Draw connections between landmarks
function drawConnectors(ctx: CanvasRenderingContext2D, landmarks: any[], canvas: HTMLCanvasElement) {
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring
    [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [0, 17] // Palm
  ];

  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;

  for (const [start, end] of connections) {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];

    ctx.beginPath();
    ctx.moveTo(startLandmark.x * canvas.width, startLandmark.y * canvas.height);
    ctx.lineTo(endLandmark.x * canvas.width, endLandmark.y * canvas.height);
    ctx.stroke();
  }
}
