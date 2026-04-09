# Hand Tracking Soroban Demo

## What is this?

A proof-of-concept that uses your computer's camera to detect hand gestures and update a 2-digit soroban in real-time. Perfect for testing interactive educational applications!

## How to use

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open in your browser**:
   - Main menu: http://localhost:5173/
   - Direct link to demo: http://localhost:5173/?hands=true

3. **Allow camera access** when prompted by your browser

4. **Hold up fingers** (0-10 using both hands) and watch the soroban update!

## How it works

- **MediaPipe Hands**: Google's free, local hand-tracking library (no API calls!)
- **Real-time detection**: Detects up to 2 hands simultaneously
- **Finger counting**: Tracks all 5 fingers on each hand
- **Soroban integration**: Updates the existing soroban component to match finger count

## Technical details

- **Library**: MediaPipe Hands (loaded from CDN)
- **Framework**: React + TypeScript
- **Performance**: Runs locally on your device (no external API calls)
- **Accuracy**: Pretty good for clear hand gestures in good lighting

## Current limitations

- Maximum of 10 fingers (2 hands × 5 fingers)
- Works best with good lighting
- Hand must be clearly visible to camera
- Some occasional false detections (can be improved with tuning)

## Next steps for educational use

- Add interactive math questions
- Create feedback/validation system
- Support for different hand gestures (open palm vs fist)
- Multi-player support (multiple kids)
- Progress tracking
- Sound effects and animations
- Mobile device support (iPad/tablet)

## Files created

- `src/components/demo/HandTrackingDemo.tsx` - Main demo component
- Updated `src/App.tsx` - Added routing and menu button

## Demo target audience

Kids in K-2nd grade learning basic arithmetic with soroban/abacus.
