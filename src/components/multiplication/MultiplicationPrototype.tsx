import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';

// Add styles for number input spinners to be always visible
const spinnerStyles = `
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    opacity: 0.6;
    cursor: pointer;
  }
  input[type="number"]:hover::-webkit-inner-spin-button,
  input[type="number"]:hover::-webkit-outer-spin-button {
    opacity: 1;
  }
`;

interface MultiplicationPrototypeProps {
  onBack: () => void;
  mode: 'area' | 'symbolic';
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

// Format the full cell value with all digits, given the place value
// Returns array of {digit: string, isActive: boolean} for rendering
function formatCellValueDigits(
  digitProduct: number,
  totalPlaceValue: number
): Array<{ digit: string; isActive: boolean }> {
  const cellValue = digitProduct * totalPlaceValue;

  // Pad to 4 digits (max is 9*9*100*100 = 810000, but we'll show 4 for up to 9999)
  const valueStr = cellValue.toString().padStart(4, '0');

  // Determine which positions are "active" (non-zero contribution from this cell)
  // The active digits are where the digitProduct contributes
  // For example: if digitProduct = 12 and totalPlaceValue = 10, cellValue = 120
  // valueStr = "0120", active positions are indices 1 and 2 (the "12")

  const digitProductStr = formatDigitProduct(digitProduct);

  // Find where the digit product appears in the padded value string
  // Start from the right and work backwards based on place value
  const placeValueDigits = totalPlaceValue.toString().length - 1; // number of zeros
  const activeStartIndex = valueStr.length - placeValueDigits - digitProductStr.length;
  const activeEndIndex = valueStr.length - placeValueDigits;

  return valueStr.split('').map((digit, index) => ({
    digit,
    isActive: index >= activeStartIndex && index < activeEndIndex,
  }));
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
              /* When selected: show the full 4-digit value with active digits highlighted in yellow */
              <div style={{
                fontSize: 28,
                fontWeight: 'bold',
                fontFamily: 'monospace',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                display: 'flex',
                gap: 2,
              }}>
                {formatCellValueDigits(digitProduct, totalPlaceValue).map((item, i) => (
                  <span
                    key={i}
                    style={{
                      color: item.isActive ? '#FFD700' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {item.digit}
                  </span>
                ))}
              </div>
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

// Symbolic Multiplication Model - shows partial products with digit selection
// Level definitions
type SymbolicLevel = {
  id: number;
  name: string;
  multiplicandDigits: number;
  multiplierDigits: number;
  rodCount: number;
};

const SYMBOLIC_LEVELS: SymbolicLevel[] = [
  { id: 1, name: '2×2 Digits', multiplicandDigits: 2, multiplierDigits: 2, rodCount: 4 },
  { id: 2, name: '2×3 Digits', multiplicandDigits: 2, multiplierDigits: 3, rodCount: 5 },
  { id: 3, name: '3×3 Digits', multiplicandDigits: 3, multiplierDigits: 3, rodCount: 6 },
  { id: 4, name: '3×4 Digits', multiplicandDigits: 3, multiplierDigits: 4, rodCount: 7 },
  { id: 5, name: '4×4 Digits', multiplicandDigits: 4, multiplierDigits: 4, rodCount: 8 },
];

// Generate random number with specified digits (no leading zeros)
const generateRandomNumber = (digits: number): string => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
};

// Level selection screen
function SymbolicLevelSelect({ onSelectLevel, onBack }: {
  onSelectLevel: (level: SymbolicLevel) => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
        padding: 20,
        gap: 24,
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

      <h2 style={{ color: '#2D1810', fontSize: 32, marginTop: 40 }}>
        Choose Level
      </h2>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        maxWidth: 400,
      }}>
        {SYMBOLIC_LEVELS.map((level) => (
          <motion.button
            key={level.id}
            onClick={() => onSelectLevel(level)}
            style={{
              padding: '20px 24px',
              fontSize: 20,
              fontWeight: 600,
              color: 'white',
              background: 'linear-gradient(135deg, #5DADE2 0%, #3498DB 100%)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
              textAlign: 'center',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Level {level.id}: {level.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function SymbolicMultiplicationModel({ onBack, level }: {
  onBack: () => void;
  level: SymbolicLevel;
}) {
  // Game state
  const [problemNumber, setProblemNumber] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');

  // Problem state
  const [multiplicand, setMultiplicand] = useState(() =>
    generateRandomNumber(level.multiplicandDigits)
  );
  const [multiplier, setMultiplier] = useState(() =>
    generateRandomNumber(level.multiplierDigits)
  );
  const [sorobanValue, setSorobanValue] = useState(0);

  // Selected digit indices (0 = leftmost digit)
  const [selectedMultiplicandIndex, setSelectedMultiplicandIndex] = useState(0);
  const [selectedMultiplierIndex, setSelectedMultiplierIndex] = useState(0);

  // Calculate correct answer
  const correctAnswer = parseInt(multiplicand) * parseInt(multiplier);

  // Generate new problem
  const generateNewProblem = () => {
    setMultiplicand(generateRandomNumber(level.multiplicandDigits));
    setMultiplier(generateRandomNumber(level.multiplierDigits));
    setSorobanValue(0);
    setSelectedMultiplicandIndex(0);
    setSelectedMultiplierIndex(0);
    setFeedback('none');
  };

  // Clear soroban
  const handleClear = () => {
    setSorobanValue(0);
  };

  // Check answer
  const handleCheck = () => {
    if (sorobanValue === correctAnswer) {
      setFeedback('correct');
      setCorrectCount(correctCount + 1);
    } else {
      setFeedback('incorrect');
      setTimeout(() => setFeedback('none'), 1500);
    }
  };

  // Move to next problem
  const handleNext = () => {
    if (problemNumber < 10) {
      setProblemNumber(problemNumber + 1);
      generateNewProblem();
    } else {
      // Level complete
      setProblemNumber(11); // Trigger completion screen
    }
  };

  // Get selected digit values
  const selectedMultiplicandDigit = parseInt(multiplicand[selectedMultiplicandIndex]);
  const selectedMultiplierDigit = parseInt(multiplier[selectedMultiplierIndex]);

  // Calculate the partial product
  const digitProduct = selectedMultiplicandDigit * selectedMultiplierDigit;

  // Calculate place value (power of 10) for selected digits
  // For '4367': index 0='4' is 10^3, index 1='3' is 10^2, index 2='6' is 10^1, index 3='7' is 10^0
  const multiplicandPower = multiplicand.length - 1 - selectedMultiplicandIndex;
  const multiplierPower = multiplier.length - 1 - selectedMultiplierIndex;
  const productPower = multiplicandPower + multiplierPower; // Power of 10 for the product

  // Build display string and determine highlighted rods
  // INDEXING CONVENTION:
  // - Display string: index 0 = leftmost char
  // - Soroban rods: rod 0 = rightmost (ones), rod N-1 = leftmost
  // - Mapping: display string index i corresponds to rod (rodCount - 1 - i)

  const buildPartialProductDisplay = (): { display: string; highlightedRods: number[] } => {
    const rodCount = level.rodCount;
    const result = '0'.repeat(rodCount).split('');
    // Always pad product to 2 digits (e.g., "4" becomes "04", "20" stays "20")
    const productStr = digitProduct.toString().padStart(2, '0');
    const highlighted: number[] = [];

    // The ones digit of the product goes at rod index = productPower
    // In display string, rod N corresponds to string index (rodCount - 1 - N)
    const onesDigitRod = productPower;

    // Always place exactly 2 digits (tens and ones) and highlight 2 rods
    for (let i = 0; i < 2; i++) {
      const digitChar = productStr[productStr.length - 1 - i]; // Start from ones digit
      const rodIndex = onesDigitRod + i; // Each subsequent digit goes one rod to the left (higher index)
      const displayIndex = rodCount - 1 - rodIndex; // Convert rod index to display string index

      if (rodIndex >= 0 && rodIndex < rodCount && displayIndex >= 0 && displayIndex < rodCount) {
        result[displayIndex] = digitChar;
        highlighted.push(rodIndex);
      }
    }

    return { display: result.join(''), highlightedRods: highlighted };
  };

  const { display: partialProductDisplay, highlightedRods } = buildPartialProductDisplay();

  // Show completion screen
  if (problemNumber > 10) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
          padding: 20,
          gap: 24,
        }}
      >
        <h2 style={{ color: '#2D1810', fontSize: 36, textAlign: 'center' }}>
          Level Complete!
        </h2>
        <p style={{ color: '#5D4632', fontSize: 24 }}>
          Score: {correctCount} / 10
        </p>
        <motion.button
          onClick={onBack}
          style={{
            padding: '16px 32px',
            fontSize: 18,
            color: 'white',
            background: 'linear-gradient(135deg, #5DADE2 0%, #3498DB 100%)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Back to Menu
        </motion.button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
        padding: 20,
        gap: 24,
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

      {/* Progress indicator */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        padding: '8px 16px',
        background: '#FFF8E7',
        borderRadius: 8,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D1810',
      }}>
        Problem {problemNumber} / 10
      </div>

      <h2 style={{ color: '#2D1810', fontSize: 28, marginTop: 20 }}>
        Symbolic Model
      </h2>

      {/* Multiplication display - single row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
        {/* Multiplicand with selectable digits */}
        <div style={{ display: 'flex', gap: 4, fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace' }}>
          {multiplicand.split('').map((digit, idx) => (
            <motion.div
              key={`m1-${idx}`}
              onClick={() => setSelectedMultiplicandIndex(idx)}
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                border: selectedMultiplicandIndex === idx ? '4px solid #9C27B0' : '2px solid #D4C4A8',
                background: selectedMultiplicandIndex === idx ? '#F3E5F5' : '#FFF8E7',
                color: '#2D1810',
                cursor: 'pointer',
                boxShadow: selectedMultiplicandIndex === idx ? '0 4px 12px rgba(156, 39, 176, 0.3)' : 'none',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {digit}
            </motion.div>
          ))}
        </div>

        {/* Multiplication symbol */}
        <div style={{ fontSize: 36, color: '#2D1810', fontWeight: 'bold' }}>×</div>

        {/* Multiplier with selectable digits */}
        <div style={{ display: 'flex', gap: 4, fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace' }}>
          {multiplier.split('').map((digit, idx) => (
            <motion.div
              key={`m2-${idx}`}
              onClick={() => setSelectedMultiplierIndex(idx)}
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                border: selectedMultiplierIndex === idx ? '4px solid #5DADE2' : '2px solid #D4C4A8',
                background: selectedMultiplierIndex === idx ? '#E3F2FD' : '#FFF8E7',
                color: '#2D1810',
                cursor: 'pointer',
                boxShadow: selectedMultiplierIndex === idx ? '0 4px 12px rgba(52, 152, 219, 0.3)' : 'none',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {digit}
            </motion.div>
          ))}
        </div>
      </div>

      {/* 8-digit partial product display - wider spacing to match soroban rods */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 48,
      }}>
        {partialProductDisplay.split('').map((digit, displayIndex) => {
          // Convert display index to rod index: rod = rodCount - 1 - displayIndex
          const rodIndex = level.rodCount - 1 - displayIndex;
          const isHighlighted = highlightedRods.includes(rodIndex);
          return (
            <div
              key={`digit-${displayIndex}`}
              style={{
                width: 60,
                height: 70,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                fontWeight: 'bold',
                fontFamily: 'monospace',
                borderRadius: 8,
                border: isHighlighted ? '3px solid #FFD700' : '2px solid transparent',
                background: isHighlighted ? '#FFF9C4' : 'transparent',
                color: digit === '0' ? '#BDBDBD' : '#2D1810',
                boxShadow: isHighlighted ? '0 4px 12px rgba(255, 215, 0, 0.4)' : 'none',
              }}
            >
              {digit}
            </div>
          );
        })}
      </div>

      {/* Soroban */}
      <div style={{ marginTop: 24 }}>
        <Soroban
          rodCount={level.rodCount}
          size="large"
          showValue={true}
          highlightRods={highlightedRods}
          initialValue={sorobanValue}
          onValueChange={setSorobanValue}
        />
      </div>

      {/* Buttons */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 24,
      }}>
        <motion.button
          onClick={handleClear}
          style={{
            padding: '12px 32px',
            fontSize: 18,
            fontWeight: 600,
            color: '#5D4632',
            background: '#FFF8E7',
            border: '2px solid #8B7355',
            borderRadius: 12,
            cursor: 'pointer',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Clear
        </motion.button>

        <motion.button
          onClick={handleCheck}
          disabled={feedback === 'correct'}
          style={{
            padding: '12px 32px',
            fontSize: 18,
            fontWeight: 600,
            color: 'white',
            background: feedback === 'correct'
              ? 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)'
              : feedback === 'incorrect'
              ? 'linear-gradient(135deg, #F44336 0%, #E53935 100%)'
              : 'linear-gradient(135deg, #5DADE2 0%, #3498DB 100%)',
            border: 'none',
            borderRadius: 12,
            cursor: feedback === 'correct' ? 'default' : 'pointer',
            boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
            opacity: feedback === 'correct' ? 0.7 : 1,
          }}
          whileHover={feedback === 'correct' ? {} : { scale: 1.05 }}
          whileTap={feedback === 'correct' ? {} : { scale: 0.95 }}
        >
          {feedback === 'correct' ? '✓ Correct!' : feedback === 'incorrect' ? '✗ Try Again' : 'Check Answer'}
        </motion.button>

        <motion.button
          onClick={handleNext}
          disabled={feedback !== 'correct'}
          style={{
            padding: '12px 32px',
            fontSize: 18,
            fontWeight: 600,
            color: 'white',
            background: feedback === 'correct'
              ? 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)'
              : '#BDBDBD',
            border: 'none',
            borderRadius: 12,
            cursor: feedback === 'correct' ? 'pointer' : 'not-allowed',
            boxShadow: feedback === 'correct' ? '0 4px 12px rgba(156, 39, 176, 0.3)' : 'none',
            opacity: feedback === 'correct' ? 1 : 0.5,
          }}
          whileHover={feedback === 'correct' ? { scale: 1.05 } : {}}
          whileTap={feedback === 'correct' ? { scale: 0.95 } : {}}
        >
          Next →
        </motion.button>
      </div>

      <p style={{
        color: '#5D4632',
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 500,
        lineHeight: 1.6,
        marginTop: 16,
      }}>
        Click different digits to see partial products. Add each partial product to the soroban to build the final answer.
      </p>
    </div>
  );
}

export function MultiplicationPrototype({ onBack, mode }: MultiplicationPrototypeProps) {
  const [selectedLevel, setSelectedLevel] = useState<SymbolicLevel | null>(null);

  // Symbolic model implementation
  if (mode === 'symbolic') {
    if (!selectedLevel) {
      return (
        <SymbolicLevelSelect
          onSelectLevel={setSelectedLevel}
          onBack={onBack}
        />
      );
    }
    return (
      <SymbolicMultiplicationModel
        onBack={() => setSelectedLevel(null)}
        level={selectedLevel}
      />
    );
  }

  // Area model implementation below
  // Inject spinner styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = spinnerStyles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Interactive soroban states - separate digits for hundreds, tens and ones
  // Force 2x2 digit multiplication (23 × 14 = 322)
  const [leftHundreds, setLeftHundreds] = useState(0);
  const [leftTens, setLeftTens] = useState(2);
  const [leftOnes, setLeftOnes] = useState(3);
  const [topHundreds, setTopHundreds] = useState(0);
  const [topTens, setTopTens] = useState(1);
  const [topOnes, setTopOnes] = useState(4);

  // Target problem (0-999) - calculated from digit inputs
  const targetMultiplicand = leftHundreds * 100 + leftTens * 10 + leftOnes;
  const targetMultiplier = topHundreds * 100 + topTens * 10 + topOnes;

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
        <div
          style={{
            width: 70,
            padding: '4px 8px',
            fontSize: 20,
            fontWeight: 'bold',
            borderRadius: 6,
            border: '2px solid #8B7355',
            background: '#F5F5F5',
            color: '#2D1810',
            textAlign: 'center',
          }}
        >
          {targetMultiplicand}
        </div>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#2D1810' }}>×</span>
        <div
          style={{
            width: 70,
            padding: '4px 8px',
            fontSize: 20,
            fontWeight: 'bold',
            borderRadius: 6,
            border: '2px solid #8B7355',
            background: '#F5F5F5',
            color: '#2D1810',
            textAlign: 'center',
          }}
        >
          {targetMultiplier}
        </div>
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
        {/* Top row: spacer + digit inputs (multiplier) - each above its column */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {/* Spacer to align with row labels + digit inputs */}
          <div style={{ width: 136 }} />

          {/* Column digits for multiplier - each above its column */}
          {needHundredsTop && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: CELL_SIZE, gap: 4 }}>
              <div style={{
                fontSize: 18,
                color: '#2D1810',
                fontWeight: 800,
                padding: '4px 12px',
                background: 'rgba(93, 70, 50, 0.15)',
                borderRadius: 6,
                border: '2px solid #8B7355',
              }}>100s</div>
              <input
                type="number"
                min={0}
                max={9}
                value={topHundreds}
                onChange={(e) => setTopHundreds(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
                style={{
                  width: 60,
                  height: 60,
                  fontSize: 32,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  borderRadius: 8,
                  border: '3px solid #8B7355',
                  background: 'white',
                  color: '#2D1810',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </div>
          )}
          {needTensTop && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: CELL_SIZE, gap: 4 }}>
              <div style={{
                fontSize: 18,
                color: '#2D1810',
                fontWeight: 800,
                padding: '4px 12px',
                background: 'rgba(93, 70, 50, 0.15)',
                borderRadius: 6,
                border: '2px solid #8B7355',
              }}>10s</div>
              <input
                type="number"
                min={0}
                max={9}
                value={topTens}
                onChange={(e) => setTopTens(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
                style={{
                  width: 60,
                  height: 60,
                  fontSize: 32,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  borderRadius: 8,
                  border: '3px solid #8B7355',
                  background: 'white',
                  color: '#2D1810',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: CELL_SIZE, gap: 4 }}>
            <div style={{
              fontSize: 18,
              color: '#2D1810',
              fontWeight: 800,
              padding: '4px 12px',
              background: 'rgba(93, 70, 50, 0.15)',
              borderRadius: 6,
              border: '2px solid #8B7355',
            }}>1s</div>
            <input
              type="number"
              min={0}
              max={9}
              value={topOnes}
              onChange={(e) => setTopOnes(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
              style={{
                width: 60,
                height: 60,
                fontSize: 32,
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: 8,
                border: '3px solid #8B7355',
                background: 'white',
                color: '#2D1810',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </div>
        </div>

        {/* Main content rows - each with horizontal soroban feeding into its row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Hundreds row (if needed) */}
          {needHundredsLeft && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                fontSize: 18,
                color: '#2D1810',
                fontWeight: 800,
                minWidth: 60,
                textAlign: 'center',
                padding: '4px 8px',
                background: 'rgba(93, 70, 50, 0.15)',
                borderRadius: 6,
                border: '2px solid #8B7355',
              }}>100s</div>
              <input
                type="number"
                min={0}
                max={9}
                value={leftHundreds}
                onChange={(e) => setLeftHundreds(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
                style={{
                  width: 60,
                  height: 60,
                  fontSize: 32,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  borderRadius: 8,
                  border: '3px solid #8B7355',
                  background: 'white',
                  color: '#2D1810',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                fontSize: 18,
                color: '#2D1810',
                fontWeight: 800,
                minWidth: 60,
                textAlign: 'center',
                padding: '4px 8px',
                background: 'rgba(93, 70, 50, 0.15)',
                borderRadius: 6,
                border: '2px solid #8B7355',
              }}>10s</div>
              <input
                type="number"
                min={0}
                max={9}
                value={leftTens}
                onChange={(e) => setLeftTens(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
                style={{
                  width: 60,
                  height: 60,
                  fontSize: 32,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  borderRadius: 8,
                  border: '3px solid #8B7355',
                  background: 'white',
                  color: '#2D1810',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              fontSize: 18,
              color: '#2D1810',
              fontWeight: 800,
              minWidth: 60,
              textAlign: 'center',
              padding: '4px 8px',
              background: 'rgba(93, 70, 50, 0.15)',
              borderRadius: 6,
              border: '2px solid #8B7355',
            }}>1s</div>
            <input
              type="number"
              min={0}
              max={9}
              value={leftOnes}
              onChange={(e) => setLeftOnes(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
              style={{
                width: 60,
                height: 60,
                fontSize: 32,
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: 8,
                border: '3px solid #8B7355',
                background: 'white',
                color: '#2D1810',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
