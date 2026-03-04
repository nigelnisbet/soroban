import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';

interface MultiplicationPrototypeProps {
  onBack: () => void;
}

// Mini bead component for the soroban arms
function MiniBead({
  type,
  isActive,
  onClick,
}: {
  type: 'heaven' | 'earth';
  isActive: boolean;
  onClick: () => void;
}) {
  const size = 28;
  const activeColor = type === 'heaven'
    ? 'linear-gradient(135deg, #4A90D9 0%, #2E5A8A 100%)'
    : 'linear-gradient(135deg, #D4A574 0%, #8B6914 100%)';
  const inactiveColor = 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)';
  const activeBorder = type === 'heaven' ? '#1E3A5A' : '#6B5344';
  const inactiveBorder = '#616161';

  return (
    <motion.div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: isActive ? activeColor : inactiveColor,
        border: `2px solid ${isActive ? activeBorder : inactiveBorder}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: 11,
        boxShadow: isActive
          ? '0 2px 4px rgba(0,0,0,0.3)'
          : '0 1px 2px rgba(0,0,0,0.2)',
        opacity: isActive ? 1 : 0.5,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {type === 'heaven' ? '5' : '1'}
    </motion.div>
  );
}

// Cell size constant - used by both MiniSoroban and PlaceValueCell
const CELL_SIZE = 90;

// Mini soroban for a single digit (0-9)
function MiniSoroban({
  value,
  onChange,
  orientation,
  label,
}: {
  value: number;
  onChange: (newValue: number) => void;
  orientation: 'vertical' | 'horizontal';
  label?: string;
}) {
  const heavenActive = value >= 5;
  const earthCount = value % 5;

  const handleHeavenToggle = () => {
    if (heavenActive) {
      onChange(earthCount); // Turn off heaven bead
    } else {
      onChange(5 + earthCount); // Turn on heaven bead
    }
  };

  const handleEarthToggle = (index: number) => {
    const newEarthCount = index < earthCount ? index : index + 1;
    onChange((heavenActive ? 5 : 0) + newEarthCount);
  };

  const isVertical = orientation === 'vertical';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 6,
        background: 'linear-gradient(135deg, #8B7355 0%, #5D4632 100%)',
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        // Fixed width/height to match cell size
        width: isVertical ? CELL_SIZE : 'auto',
        minWidth: isVertical ? CELL_SIZE : 240,
        boxSizing: 'border-box',
      }}
    >
      {/* Label if provided */}
      {label && !isVertical && (
        <div style={{ fontSize: 10, color: '#FFF8E7', marginRight: 4, minWidth: 24 }}>
          {label}
        </div>
      )}

      {/* Heaven bead */}
      <MiniBead
        type="heaven"
        isActive={heavenActive}
        onClick={handleHeavenToggle}
      />

      {/* Divider */}
      <div
        style={{
          width: isVertical ? 32 : 3,
          height: isVertical ? 3 : 32,
          background: '#4A3728',
          borderRadius: 2,
          margin: isVertical ? '2px 0' : '0 2px',
        }}
      />

      {/* Earth beads */}
      {[0, 1, 2, 3].map((i) => (
        <MiniBead
          key={i}
          type="earth"
          isActive={i < earthCount}
          onClick={() => handleEarthToggle(i)}
        />
      ))}

      {/* Value display */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: '#FFF8E7',
          marginLeft: isVertical ? 0 : 4,
          marginTop: isVertical ? 4 : 0,
          minWidth: 16,
          textAlign: 'center',
        }}
      >
        {value}
      </div>

      {/* Label if vertical */}
      {label && isVertical && (
        <div style={{ fontSize: 9, color: '#FFF8E7', marginTop: 2 }}>
          {label}
        </div>
      )}
    </div>
  );
}

// Format the digit product with leading zero (always 2 digits since max is 81)
function formatDigitProduct(digitProduct: number): string {
  return digitProduct.toString().padStart(2, '0');
}

// Area model cell for place value multiplication
function PlaceValueCell({
  rowDigit,
  colDigit,
  rowPlaceValue,
  colPlaceValue,
  isActive,
  isSelected,
  onClick,
}: {
  rowDigit: number;
  colDigit: number;
  rowPlaceValue: number;
  colPlaceValue: number;
  isActive: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const digitProduct = rowDigit * colDigit;
  const totalPlaceValue = rowPlaceValue * colPlaceValue;
  const cellValue = digitProduct * totalPlaceValue;

  // Color based on combined place value
  let bgColor: string;
  let borderColor: string;
  if (totalPlaceValue >= 10000) {
    bgColor = 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)'; // Pink for 10000s
    borderColor = '#AD1457';
  } else if (totalPlaceValue >= 1000) {
    bgColor = 'linear-gradient(135deg, #673AB7 0%, #512DA8 100%)'; // Deep purple for 1000s
    borderColor = '#4527A0';
  } else if (totalPlaceValue >= 100) {
    bgColor = 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)'; // Purple for 100s
    borderColor = '#6A1B9A';
  } else if (totalPlaceValue >= 10) {
    bgColor = 'linear-gradient(135deg, #5DADE2 0%, #3498DB 100%)'; // Blue for 10s
    borderColor = '#2980B9';
  } else {
    bgColor = 'linear-gradient(135deg, #F5B041 0%, #D4A017 100%)'; // Gold for 1s
    borderColor = '#B8860B';
  }

  return (
    <motion.div
      onClick={onClick}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        background: isActive ? bgColor : '#E0E0E0',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: `3px solid ${isSelected ? '#FFD700' : (isActive ? borderColor : '#BDBDBD')}`,
        opacity: isActive ? 1 : 0.3,
        cursor: isActive ? 'pointer' : 'default',
        boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.6)' : 'none',
      }}
      animate={{ scale: isActive ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={isActive ? { scale: 1.05 } : {}}
      whileTap={isActive ? { scale: 0.98 } : {}}
    >
      <AnimatePresence mode="wait">
        {isActive && digitProduct > 0 && (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {isSelected ? (
              /* When selected: just show the big two-digit product */
              <span style={{
                fontSize: 36,
                fontWeight: 'bold',
                color: '#FFD700',
                fontFamily: 'monospace',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}>
                {formatDigitProduct(digitProduct)}
              </span>
            ) : (
              /* When not selected: show all the info */
              <>
                <span style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.8)',
                }}>
                  {rowDigit} × {colDigit}
                </span>
                <span style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'monospace',
                }}>
                  {formatDigitProduct(digitProduct)}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  × {totalPlaceValue}
                </span>
                <span style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: 'white',
                  fontFamily: 'monospace',
                }}>
                  {cellValue}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Place value types
type PlaceValue = 'hundreds' | 'tens' | 'ones';

// Type for selected cell - identifies which partial product is selected
type SelectedCell = {
  rowPlace: PlaceValue;
  colPlace: PlaceValue;
  // Starting rod index (from right, 0-indexed) for the 2-rod highlight
  startRod: number;
} | null;

// Feedback state for answer checking
type FeedbackState = 'none' | 'correct' | 'incorrect';

export function MultiplicationPrototype({ onBack }: MultiplicationPrototypeProps) {
  // Target problem (0-999)
  const [targetMultiplicand, setTargetMultiplicand] = useState(23);
  const [targetMultiplier, setTargetMultiplier] = useState(14);

  // Interactive soroban states - separate digits for hundreds, tens and ones
  const [leftHundreds, setLeftHundreds] = useState(0);
  const [leftTens, setLeftTens] = useState(0);
  const [leftOnes, setLeftOnes] = useState(0);
  const [topHundreds, setTopHundreds] = useState(0);
  const [topTens, setTopTens] = useState(0);
  const [topOnes, setTopOnes] = useState(0);

  // Answer soroban value
  const [answerValue, setAnswerValue] = useState(0);

  // Feedback state
  const [feedback, setFeedback] = useState<FeedbackState>('none');

  // Which cell is selected (for highlighting rods)
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);

  // Calculate correct answer
  const correctAnswer = targetMultiplicand * targetMultiplier;

  // Determine how many digits each number has
  const getDigitCount = (n: number): number => {
    if (n >= 100) return 3;
    if (n >= 10) return 2;
    return 1;
  };

  const multiplicandDigits = getDigitCount(targetMultiplicand);
  const multiplierDigits = getDigitCount(targetMultiplier);

  // Determine which place values are needed
  const needHundredsLeft = multiplicandDigits >= 3;
  const needTensLeft = multiplicandDigits >= 2;
  const needHundredsTop = multiplierDigits >= 3;
  const needTensTop = multiplierDigits >= 2;

  // Determine how many rods needed for answer
  const answerRodCount = multiplicandDigits + multiplierDigits;

  // Calculate which rods a cell's result should go to
  // Place value offset: hundreds=2, tens=1, ones=0
  const getPlaceOffset = (place: PlaceValue): number => {
    if (place === 'hundreds') return 2;
    if (place === 'tens') return 1;
    return 0;
  };

  const getStartRod = (rowPlace: PlaceValue, colPlace: PlaceValue): number => {
    return getPlaceOffset(rowPlace) + getPlaceOffset(colPlace);
  };

  const handleCellClick = (rowPlace: PlaceValue, colPlace: PlaceValue) => {
    const startRod = getStartRod(rowPlace, colPlace);
    // Toggle selection
    if (selectedCell?.rowPlace === rowPlace && selectedCell?.colPlace === colPlace) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ rowPlace, colPlace, startRod });
    }
  };

  // Check answer
  const handleCheck = () => {
    if (answerValue === correctAnswer) {
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
    // Reset feedback after 2 seconds
    setTimeout(() => setFeedback('none'), 2000);
  };

  // Get digit value from a number at a specific place
  const getDigit = (n: number, place: PlaceValue): number => {
    if (place === 'hundreds') return Math.floor(n / 100) % 10;
    if (place === 'tens') return Math.floor(n / 10) % 10;
    return n % 10;
  };

  // Get place value multiplier
  const getPlaceMultiplier = (place: PlaceValue): number => {
    if (place === 'hundreds') return 100;
    if (place === 'tens') return 10;
    return 1;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
        padding: 20,
        gap: 16,
      }}
    >
      {/* Back button */}
      <motion.button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: '#FFF8E7',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        ←
      </motion.button>

      <h1
        style={{
          fontSize: 24,
          color: '#2D1810',
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          margin: 0,
          marginTop: 12,
        }}
      >
        Multiplication Lab
      </h1>

      {/* Target problem display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 20px',
          background: '#FFF8E7',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <input
          type="number"
          min={0}
          max={999}
          value={targetMultiplicand}
          onChange={(e) => setTargetMultiplicand(Math.min(999, Math.max(0, Number(e.target.value))))}
          style={{
            width: 70,
            padding: '4px 8px',
            fontSize: 20,
            fontWeight: 'bold',
            borderRadius: 6,
            border: '2px solid #8B7355',
            background: 'white',
            color: '#2D1810',
            textAlign: 'center',
          }}
        />
        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#2D1810' }}>×</span>
        <input
          type="number"
          min={0}
          max={999}
          value={targetMultiplier}
          onChange={(e) => setTargetMultiplier(Math.min(999, Math.max(0, Number(e.target.value))))}
          style={{
            width: 70,
            padding: '4px 8px',
            fontSize: 20,
            fontWeight: 'bold',
            borderRadius: 6,
            border: '2px solid #8B7355',
            background: 'white',
            color: '#2D1810',
            textAlign: 'center',
          }}
        />
      </div>

      {/* Interactive Area Model */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 12,
          background: '#FFF8E7',
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}
      >
        {/* Top row: spacer + vertical sorobans (multiplier) - each above its column */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {/* Spacer to align with horizontal sorobans + label */}
          <div style={{ width: 274 }} />

          {/* Vertical sorobans for multiplier - each above its column */}
          {needHundredsTop && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: CELL_SIZE }}>
              <span style={{ fontSize: 11, color: '#5D4632', fontWeight: 600, marginBottom: 2 }}>100s</span>
              <MiniSoroban
                value={topHundreds}
                onChange={setTopHundreds}
                orientation="vertical"
              />
            </div>
          )}
          {needTensTop && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: CELL_SIZE }}>
              <span style={{ fontSize: 11, color: '#5D4632', fontWeight: 600, marginBottom: 2 }}>10s</span>
              <MiniSoroban
                value={topTens}
                onChange={setTopTens}
                orientation="vertical"
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: CELL_SIZE }}>
            <span style={{ fontSize: 11, color: '#5D4632', fontWeight: 600, marginBottom: 2 }}>1s</span>
            <MiniSoroban
              value={topOnes}
              onChange={setTopOnes}
              orientation="vertical"
            />
          </div>
        </div>

        {/* Main content rows - each with horizontal soroban feeding into its row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Hundreds row (if needed) */}
          {needHundredsLeft && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#5D4632', fontWeight: 600, width: 30, textAlign: 'right' }}>100s</span>
              <MiniSoroban
                value={leftHundreds}
                onChange={setLeftHundreds}
                orientation="horizontal"
              />

              {/* Hundreds row cells */}
              {needHundredsTop && (
                <PlaceValueCell
                  rowDigit={leftHundreds}
                  colDigit={topHundreds}
                  rowPlaceValue={100}
                  colPlaceValue={100}
                  isActive={leftHundreds > 0 && topHundreds > 0}
                  isSelected={selectedCell?.rowPlace === 'hundreds' && selectedCell?.colPlace === 'hundreds'}
                  onClick={() => handleCellClick('hundreds', 'hundreds')}
                />
              )}
              {needTensTop && (
                <PlaceValueCell
                  rowDigit={leftHundreds}
                  colDigit={topTens}
                  rowPlaceValue={100}
                  colPlaceValue={10}
                  isActive={leftHundreds > 0 && topTens > 0}
                  isSelected={selectedCell?.rowPlace === 'hundreds' && selectedCell?.colPlace === 'tens'}
                  onClick={() => handleCellClick('hundreds', 'tens')}
                />
              )}
              <PlaceValueCell
                rowDigit={leftHundreds}
                colDigit={topOnes}
                rowPlaceValue={100}
                colPlaceValue={1}
                isActive={leftHundreds > 0 && topOnes > 0}
                isSelected={selectedCell?.rowPlace === 'hundreds' && selectedCell?.colPlace === 'ones'}
                onClick={() => handleCellClick('hundreds', 'ones')}
              />
            </div>
          )}

          {/* Tens row (if needed) */}
          {needTensLeft && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#5D4632', fontWeight: 600, width: 30, textAlign: 'right' }}>10s</span>
              <MiniSoroban
                value={leftTens}
                onChange={setLeftTens}
                orientation="horizontal"
              />

              {/* Tens row cells */}
              {needHundredsTop && (
                <PlaceValueCell
                  rowDigit={leftTens}
                  colDigit={topHundreds}
                  rowPlaceValue={10}
                  colPlaceValue={100}
                  isActive={leftTens > 0 && topHundreds > 0}
                  isSelected={selectedCell?.rowPlace === 'tens' && selectedCell?.colPlace === 'hundreds'}
                  onClick={() => handleCellClick('tens', 'hundreds')}
                />
              )}
              {needTensTop && (
                <PlaceValueCell
                  rowDigit={leftTens}
                  colDigit={topTens}
                  rowPlaceValue={10}
                  colPlaceValue={10}
                  isActive={leftTens > 0 && topTens > 0}
                  isSelected={selectedCell?.rowPlace === 'tens' && selectedCell?.colPlace === 'tens'}
                  onClick={() => handleCellClick('tens', 'tens')}
                />
              )}
              <PlaceValueCell
                rowDigit={leftTens}
                colDigit={topOnes}
                rowPlaceValue={10}
                colPlaceValue={1}
                isActive={leftTens > 0 && topOnes > 0}
                isSelected={selectedCell?.rowPlace === 'tens' && selectedCell?.colPlace === 'ones'}
                onClick={() => handleCellClick('tens', 'ones')}
              />
            </div>
          )}

          {/* Ones row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#5D4632', fontWeight: 600, width: 30, textAlign: 'right' }}>1s</span>
            <MiniSoroban
              value={leftOnes}
              onChange={setLeftOnes}
              orientation="horizontal"
            />

            {/* Ones row cells */}
            {needHundredsTop && (
              <PlaceValueCell
                rowDigit={leftOnes}
                colDigit={topHundreds}
                rowPlaceValue={1}
                colPlaceValue={100}
                isActive={leftOnes > 0 && topHundreds > 0}
                isSelected={selectedCell?.rowPlace === 'ones' && selectedCell?.colPlace === 'hundreds'}
                onClick={() => handleCellClick('ones', 'hundreds')}
              />
            )}
            {needTensTop && (
              <PlaceValueCell
                rowDigit={leftOnes}
                colDigit={topTens}
                rowPlaceValue={1}
                colPlaceValue={10}
                isActive={leftOnes > 0 && topTens > 0}
                isSelected={selectedCell?.rowPlace === 'ones' && selectedCell?.colPlace === 'tens'}
                onClick={() => handleCellClick('ones', 'tens')}
              />
            )}
            <PlaceValueCell
              rowDigit={leftOnes}
              colDigit={topOnes}
              rowPlaceValue={1}
              colPlaceValue={1}
              isActive={leftOnes > 0 && topOnes > 0}
              isSelected={selectedCell?.rowPlace === 'ones' && selectedCell?.colPlace === 'ones'}
              onClick={() => handleCellClick('ones', 'ones')}
            />
          </div>
        </div>
      </div>

      {/* Answer Soroban with rod highlighting and check button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Soroban
          rodCount={answerRodCount}
          size="medium"
          showValue={false}
          onValueChange={setAnswerValue}
          highlightRods={selectedCell ? [selectedCell.startRod, selectedCell.startRod + 1] : undefined}
        />

        {/* Value display with feedback coloring */}
        <motion.div
          style={{
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            color: feedback === 'correct' ? '#4CAF50' : feedback === 'incorrect' ? '#F44336' : '#2D1810',
            textShadow: feedback !== 'none' ? `0 0 20px ${feedback === 'correct' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}` : '0 2px 4px rgba(0,0,0,0.1)',
          }}
          animate={{
            scale: feedback !== 'none' ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          {answerValue}
        </motion.div>

        {/* Check button */}
        <motion.button
          onClick={handleCheck}
          style={{
            padding: '10px 32px',
            fontSize: 18,
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
          }}
          whileHover={{ scale: 1.05, boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)' }}
          whileTap={{ scale: 0.95 }}
        >
          Check
        </motion.button>
      </div>
    </div>
  );
}
