# Tactile Soroban Interactions

## New Drag-Based Interaction System

The virtual soroban now mimics real soroban physics with natural drag gestures and haptic feedback.

### Single Bead Dragging

**Heaven Beads (worth 5):**
- Drag DOWN to activate (move toward divider)
- Drag UP to deactivate (move away from divider)
- 20px drag threshold before toggle
- Haptic feedback:
  - Light tap on touch
  - Medium impact on toggle

**Earth Beads (worth 1 each):**
- Drag UP to activate (move toward divider)
- Drag DOWN to deactivate (move away from divider)
- Multiple beads activate/deactivate in stack
- Same haptic pattern as heaven beads

### Two-Finger Pinch Gestures

**Simultaneous Heaven + Earth Control:**

1. **One finger in heaven section, one in earth section:**
   - Pinch UP (heaven down + earth up) = Increase value significantly
     - Activates heaven bead + adds 2 earth beads
   - Pinch DOWN (heaven up + earth down) = Decrease value
     - Deactivates heaven bead OR removes 2 earth beads

2. **Both fingers in earth section:**
   - Spread UP (both fingers up) = Add 2 earth beads
   - Pinch DOWN (both fingers down) = Remove 2 earth beads

3. **Haptic Feedback:**
   - Light tap when two fingers touch rod
   - Medium impact when value changes
   - 25px threshold before toggle

### Technical Details

**Drag Implementation:**
- Uses Framer Motion's `drag="y"` with constraints
- `dragElastic={0.2}` for slight over-drag feel
- `dragMomentum={false}` for precise control
- Beads snap back to position after toggle

**Multitouch Implementation:**
- Native touch events (touchstart, touchmove, touchend)
- Tracks touch identifiers for accurate gesture recognition
- Prevents default to avoid scroll conflicts
- Section detection based on rod geometry

**Haptics:**
- `@capacitor/haptics` plugin
- Light impact: Touch feedback
- Medium impact: State change feedback
- Works on iOS devices with Taptic Engine

## Testing on Device

To test these interactions:

1. Build and sync: `npm run build && npx cap sync ios`
2. Open Xcode: `npx cap open ios`
3. Deploy to physical iOS device (simulator doesn't support haptics)
4. Try single-finger drags on individual beads
5. Try two-finger pinch gestures on a rod

## Next Steps

Potential refinements:
- Adjust drag threshold based on user testing
- Add audio feedback alongside haptics
- Fine-tune haptic intensity patterns
- Experiment with different pinch patterns
- Add visual feedback during multitouch (glow/highlight)
