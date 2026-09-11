import { useState, useRef, useEffect } from 'react';
import type { ColumnHoverState } from '@/features/hud/contracts/state';

export default function useColumnHover(): ColumnHoverState {
  const initialRandomTexts = ['DATA-Ø05', ...Array(5).fill('DATA-Ø??')];
  const [randomHudTexts, setRandomHudTexts] = useState<string[]>(initialRandomTexts);
  const [branchText1, setBranchText1] = useState('');
  const [branchText2, setBranchText2] = useState('');
  const [branchText3, setBranchText3] = useState('');
  const [branchText4, setBranchText4] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const branchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const branchUpdateCounterRef = useRef(0);

  const updateRandomHudTexts = () => {
    const newTexts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const randomNum = Math.floor(Math.random() * 99) + 1;
      const numStr = String(randomNum).padStart(2, '0');
      newTexts.push(`DATA-Ø${numStr}`);
    }
    setRandomHudTexts(newTexts);
  };

  const generateRandomChars = (length?: number) => {
    const targetLength = length ?? Math.floor(Math.random() * 4) + 3;

    const chars =
      'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:\'",.<>/?~`§±¥₩£¢€©®™×÷≠≤≥∞∑∫√≈≠≡';
    let result = '';
    const safeTargetLength = Math.max(0, targetLength);

    for (let i = 0; i < safeTargetLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i < safeTargetLength - 1) {
        result += '\n';
      }
    }
    return result;
  };

  const handleColumnMouseEnter = (index: number) => {
    if (index === 5) {
      // ABOUT column
      updateRandomHudTexts();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(updateRandomHudTexts, 50);
    } else if (index === 1) {
      // EXPERIENCE column
      branchUpdateCounterRef.current = 0;
      if (branchIntervalRef.current) clearInterval(branchIntervalRef.current);

      const getTargetLength = (effectiveCount: number) => {
        if (effectiveCount <= 15) return 1;
        else if (effectiveCount <= 24) return 2;
        else if (effectiveCount <= 36) return 3;
        else if (effectiveCount <= 48) return 4;
        else return Math.floor(Math.random() * 3) + 4;
      };

      const initialMainCount = 1;
      const initialLength1 = getTargetLength(initialMainCount + 45);
      const initialLength2 = getTargetLength(initialMainCount + 30);
      const initialLength3 = getTargetLength(initialMainCount + 15);
      const initialLength4 = getTargetLength(initialMainCount + 0);

      setBranchText1(generateRandomChars(initialLength1));
      setBranchText2(generateRandomChars(initialLength2));
      setBranchText3(generateRandomChars(initialLength3));
      setBranchText4(generateRandomChars(initialLength4));
      branchUpdateCounterRef.current = initialMainCount;

      branchIntervalRef.current = setInterval(() => {
        branchUpdateCounterRef.current += 1;
        const mainCount = branchUpdateCounterRef.current;

        const length1 = getTargetLength(mainCount + 45);
        const length2 = getTargetLength(mainCount + 30);
        const length3 = getTargetLength(mainCount + 15);
        const length4 = getTargetLength(mainCount + 0);

        setBranchText1(generateRandomChars(length1));
        setBranchText2(generateRandomChars(length2));
        setBranchText3(generateRandomChars(length3));
        setBranchText4(generateRandomChars(length4));
      }, 100);
    }
  };

  const handleColumnMouseLeave = (index: number) => {
    if (index === 5) {
      // ABOUT column
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else if (index === 1) {
      // EXPERIENCE column
      if (branchIntervalRef.current) {
        clearInterval(branchIntervalRef.current);
        branchIntervalRef.current = null;
      }
      setBranchText1('');
      setBranchText2('');
      setBranchText3('');
      setBranchText4('');
      branchUpdateCounterRef.current = 0;
    }
  };

  // Cleanup intervals on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (branchIntervalRef.current) {
        clearInterval(branchIntervalRef.current);
        branchIntervalRef.current = null;
      }
    };
  }, []);

  return {
    randomHudTexts,
    branchText1,
    branchText2,
    branchText3,
    branchText4,
    handleColumnMouseEnter,
    handleColumnMouseLeave,
  };
}
