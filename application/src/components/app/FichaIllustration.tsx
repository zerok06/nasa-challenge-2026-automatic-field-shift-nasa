import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

const green = '#1B5E20';
const leaf = '#3C9453';
const soft = '#DFF0E2';
const brown = '#6D4C41';
const earth = '#8D6E63';
const cream = '#FAF7F0';

function HistoryArt() {
  return (
    <G>
      <Line x1="12" y1="74" x2="84" y2="74" stroke={brown} strokeWidth="4" strokeLinecap="round" />
      <Line x1="24" y1="74" x2="24" y2="50" stroke={earth} strokeWidth="3" strokeLinecap="round" />
      <Line x1="48" y1="74" x2="48" y2="42" stroke={earth} strokeWidth="3" strokeLinecap="round" />
      <Line x1="72" y1="74" x2="72" y2="54" stroke={earth} strokeWidth="3" strokeLinecap="round" />
      <Path d="M24 54c-9-2-13-9-13-17 9 0 16 5 18 14" fill={soft} stroke={green} strokeWidth="2" />
      <Path d="M24 50c8-2 12-8 12-16-8 0-14 5-16 13" fill={soft} stroke={leaf} strokeWidth="2" />
      <Path d="M48 46c-8-2-12-8-12-16 8 0 14 5 16 13" fill={soft} stroke={green} strokeWidth="2" />
      <Path d="M72 58c-8-2-12-8-12-16 8 0 14 5 16 13" fill={soft} stroke={leaf} strokeWidth="2" />
    </G>
  );
}

function WaterArt() {
  return (
    <G>
      <Path
        d="M48 14c-10 14-20 25-20 37a20 20 0 0 0 40 0c0-12-10-23-20-37Z"
        fill={soft}
        stroke={green}
        strokeWidth="3"
      />
      <Path d="M38 53c2 7 8 11 15 11" fill="none" stroke={leaf} strokeWidth="3" strokeLinecap="round" />
      <Line x1="18" y1="82" x2="78" y2="82" stroke={brown} strokeWidth="3" strokeLinecap="round" />
      <Path d="M26 82c6-5 12-5 18 0s12 5 18 0" fill="none" stroke={earth} strokeWidth="3" />
    </G>
  );
}

function SoilArt() {
  return (
    <G>
      <Rect x="12" y="50" width="72" height="10" rx="5" fill={soft} stroke={green} strokeWidth="2" />
      <Rect x="18" y="60" width="60" height="10" rx="5" fill="#F1E7DB" stroke={brown} strokeWidth="2" />
      <Rect x="24" y="70" width="48" height="8" rx="4" fill="#E5D3C1" stroke={earth} strokeWidth="2" />
      <Line x1="48" y1="50" x2="48" y2="30" stroke={green} strokeWidth="3" strokeLinecap="round" />
      <Path d="M48 36c-8-2-12-8-12-16 8 0 14 5 16 13" fill={soft} stroke={green} strokeWidth="2" />
      <Path d="M48 42c8-2 12-8 12-16-8 0-14 5-16 13" fill={soft} stroke={leaf} strokeWidth="2" />
    </G>
  );
}

function PrioritiesArt() {
  return (
    <G>
      <Line x1="48" y1="78" x2="48" y2="38" stroke={green} strokeWidth="4" strokeLinecap="round" />
      <Path d="M48 54c-18 0-28-10-28-26 16 0 28 9 28 26Z" fill={soft} stroke={green} strokeWidth="2" />
      <Path d="M48 48c18 0 28-10 28-26-16 0-28 9-28 26Z" fill={soft} stroke={leaf} strokeWidth="2" />
      <Circle cx="48" cy="80" r="4" fill={brown} />
    </G>
  );
}

function CheckArt() {
  return (
    <G>
      <Circle cx="48" cy="48" r="30" fill={soft} stroke={green} strokeWidth="3" />
      <Path
        d="M34 49l9 9 18-20"
        fill="none"
        stroke={green}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M24 82c7-5 13-5 20 0" fill="none" stroke={brown} strokeWidth="3" strokeLinecap="round" />
    </G>
  );
}

export function FichaIllustration({ step }: { step: number }) {
  return (
    <Svg
      width={88}
      height={88}
      viewBox="0 0 96 96"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx="48" cy="48" r="44" fill={cream} />
      {step === 0 ? <HistoryArt /> : null}
      {step === 1 ? <WaterArt /> : null}
      {step === 2 ? <SoilArt /> : null}
      {step === 3 ? <PrioritiesArt /> : null}
      {step === 4 ? <CheckArt /> : null}
    </Svg>
  );
}
