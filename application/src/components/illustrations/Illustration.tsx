import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

export type IllustrationName =
  | 'field'
  | 'parcel'
  | 'prices'
  | 'water'
  | 'compare'
  | 'scenario'
  | 'agent'
  | 'empty'
  | 'success'
  | 'offline'
  | 'sources'
  | 'onboarding-language'
  | 'onboarding-profile'
  | 'onboarding-location'
  | 'onboarding-consent'
  | 'crop-onion'
  | 'crop-pumpkin'
  | 'crop-chili'
  | 'crop-potato'
  | 'crop-corn'
  | 'crop-quinoa'
  | 'crop-alfalfa'
  | 'crop-bean';

const palette = {
  green: '#2E6B45',
  greenSoft: '#DCEBDD',
  greenLight: '#8FB98F',
  earth: '#8A5A3B',
  earthSoft: '#EAD9C8',
  cream: '#F7F1E3',
  sun: '#D9A441',
  ink: '#3E2E22',
  water: '#4F7E91',
  white: '#FFFDF8',
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <G>
      <Rect x="4" y="4" width="112" height="112" rx="24" fill={palette.cream} />
      <Circle cx="96" cy="24" r="10" fill={palette.sun} opacity={0.8} />
      {children}
    </G>
  );
}

function Terraces() {
  return (
    <G>
      <Path d="M12 88 C32 70 54 78 72 66 C88 56 102 58 110 64 L110 110 L12 110 Z" fill={palette.green} />
      <Path d="M12 96 C34 82 52 88 70 78 C88 68 100 70 110 74" stroke={palette.greenSoft} strokeWidth="4" fill="none" />
      <Path d="M12 104 C34 92 54 98 72 88 C88 80 102 82 110 86" stroke={palette.greenSoft} strokeWidth="4" fill="none" />
    </G>
  );
}

function CropPlant({ x, color = palette.green }: { x: number; color?: string }) {
  return (
    <G>
      <Line x1={x} y1="88" x2={x} y2="68" stroke={palette.earth} strokeWidth="4" strokeLinecap="round" />
      <Ellipse cx={x - 6} cy="72" rx="8" ry="5" fill={color} transform={`rotate(-24 ${x - 6} 72)`} />
      <Ellipse cx={x + 6} cy="70" rx="8" ry="5" fill={color} transform={`rotate(24 ${x + 6} 70)`} />
    </G>
  );
}

export function Illustration({
  name,
  size = 96,
  accessibilityLabel,
}: {
  name: IllustrationName;
  size?: number;
  accessibilityLabel?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
    >
      {name === 'field' ? (
        <Frame>
          <Terraces />
          <Circle cx="36" cy="40" r="14" fill={palette.sun} />
          <Path d="M28 40 H44 M36 32 V48" stroke={palette.cream} strokeWidth="3" strokeLinecap="round" />
        </Frame>
      ) : null}

      {name === 'parcel' ? (
        <Frame>
          <Terraces />
          <Path
            d="M60 24 C48 24 40 33 40 44 C40 59 60 78 60 78 C60 78 80 59 80 44 C80 33 72 24 60 24 Z"
            fill={palette.earth}
          />
          <Circle cx="60" cy="44" r="8" fill={palette.cream} />
        </Frame>
      ) : null}

      {name === 'prices' ? (
        <Frame>
          <Path d="M22 46 H98 L90 34 H30 Z" fill={palette.green} />
          <Rect x="28" y="46" width="64" height="54" rx="8" fill={palette.white} />
          <Rect x="36" y="54" width="48" height="8" rx="4" fill={palette.earthSoft} />
          <Ellipse cx="52" cy="82" rx="14" ry="8" fill={palette.earth} />
          <Ellipse cx="52" cy="88" rx="14" ry="8" fill={palette.earth} />
          <Circle cx="82" cy="84" r="11" fill={palette.sun} />
          <Path d="M77 84 H87 M82 79 V89" stroke={palette.ink} strokeWidth="2.5" strokeLinecap="round" />
        </Frame>
      ) : null}

      {name === 'water' ? (
        <Frame>
          <Terraces />
          <Path d="M22 54 C34 64 44 54 54 64 C64 74 74 64 84 74 C92 82 98 78 102 76" stroke={palette.water} strokeWidth="8" fill="none" strokeLinecap="round" />
          <Path
            d="M64 22 C56 32 52 38 52 44 C52 51 58 56 64 56 C70 56 76 51 76 44 C76 38 72 32 64 22 Z"
            fill={palette.water}
          />
        </Frame>
      ) : null}

      {name === 'compare' ? (
        <Frame>
          <Rect x="18" y="30" width="24" height="66" rx="8" fill={palette.greenSoft} />
          <Rect x="48" y="20" width="24" height="76" rx="8" fill={palette.greenLight} />
          <Rect x="78" y="38" width="24" height="58" rx="8" fill={palette.earthSoft} />
          <CropPlant x={30} />
          <CropPlant x={60} />
          <CropPlant x={90} color={palette.earth} />
        </Frame>
      ) : null}

      {name === 'scenario' ? (
        <Frame>
          <Rect x="20" y="28" width="80" height="10" rx="5" fill={palette.greenSoft} />
          <Circle cx="72" cy="33" r="10" fill={palette.water} />
          <Rect x="20" y="54" width="80" height="10" rx="5" fill={palette.earthSoft} />
          <Circle cx="42" cy="59" r="10" fill={palette.sun} />
          <Terraces />
        </Frame>
      ) : null}

      {name === 'agent' ? (
        <Frame>
          <Circle cx="48" cy="46" r="16" fill={palette.earth} />
          <Path d="M28 88 C28 70 36 62 48 62 C60 62 68 70 68 88" fill={palette.green} />
          <Rect x="72" y="28" width="38" height="28" rx="12" fill={palette.white} />
          <Path d="M82 56 L78 64 L90 56" fill={palette.white} />
          <Line x1="80" y1="38" x2="100" y2="38" stroke={palette.green} strokeWidth="3" strokeLinecap="round" />
          <Line x1="80" y1="46" x2="94" y2="46" stroke={palette.green} strokeWidth="3" strokeLinecap="round" />
        </Frame>
      ) : null}

      {name === 'empty' ? (
        <Frame>
          <Path d="M18 92 C36 80 52 86 68 74 C86 60 100 66 104 72 L104 104 L18 104 Z" fill={palette.greenSoft} />
          <Path d="M38 70 C46 58 54 54 62 58 C58 68 50 74 38 70 Z" fill={palette.green} />
          <Path d="M92 42 C84 48 80 54 82 60 C88 58 92 52 92 42 Z" fill={palette.greenLight} />
        </Frame>
      ) : null}

      {name === 'success' ? (
        <Frame>
          <Terraces />
          <Circle cx="60" cy="44" r="24" fill={palette.greenSoft} />
          <Path d="M60 54 V34 M60 42 C52 38 48 32 50 26 C58 28 62 34 60 42 Z" fill={palette.green} />
          <Path d="M60 46 C68 42 72 36 70 30 C62 32 58 38 60 46 Z" fill={palette.greenLight} />
        </Frame>
      ) : null}

      {name === 'offline' ? (
        <Frame>
          <Terraces />
          <Path d="M34 44 C34 32 44 24 56 24 C66 24 74 30 76 40 C86 40 92 46 92 54 C92 62 86 66 78 66 H40 C30 66 24 60 24 52 C24 46 28 42 34 44 Z" fill={palette.white} />
          <Line x1="30" y1="24" x2="92" y2="76" stroke={palette.sun} strokeWidth="5" strokeLinecap="round" />
        </Frame>
      ) : null}

      {name === 'sources' ? (
        <Frame>
          <Circle cx="60" cy="56" r="24" fill={palette.green} />
          <Ellipse cx="60" cy="56" rx="10" ry="24" fill="none" stroke={palette.cream} strokeWidth="3" />
          <Line x1="36" y1="56" x2="84" y2="56" stroke={palette.cream} strokeWidth="3" />
          <Path d="M60 32 L68 50 L60 48 L52 50 Z" fill={palette.sun} />
          <Path d="M60 80 L52 62 L60 64 L68 62 Z" fill={palette.sun} />
        </Frame>
      ) : null}

      {name === 'onboarding-language' ? (
        <Frame>
          <Rect x="24" y="30" width="72" height="50" rx="12" fill={palette.white} />
          <TextMark />
          <Path d="M36 88 H84" stroke={palette.green} strokeWidth="4" strokeLinecap="round" />
        </Frame>
      ) : null}

      {name === 'onboarding-profile' ? (
        <Frame>
          <Circle cx="60" cy="47" r="18" fill={palette.earth} />
          <Path d="M32 94 C32 72 44 64 60 64 C76 64 88 72 88 94" fill={palette.green} />
        </Frame>
      ) : null}

      {name === 'onboarding-location' ? (
        <Frame>
          <Terraces />
          <Path d="M60 22 C48 22 40 31 40 42 C40 57 60 76 60 76 C60 76 80 57 80 42 C80 31 72 22 60 22 Z" fill={palette.earth} />
          <Circle cx="60" cy="42" r="8" fill={palette.cream} />
        </Frame>
      ) : null}

      {name === 'onboarding-consent' ? (
        <Frame>
          <Path d="M60 22 L86 32 V54 C86 70 74 82 60 90 C46 82 34 70 34 54 V32 Z" fill={palette.green} />
          <Path d="M48 54 L56 62 L72 44" stroke={palette.cream} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Frame>
      ) : null}

      {name === 'crop-onion' ? <CropCrop /> : null}
      {name === 'crop-pumpkin' ? <CropPumpkin /> : null}
      {name === 'crop-chili' ? <CropChili /> : null}
      {name === 'crop-potato' ? <CropPotato /> : null}
      {name === 'crop-corn' ? <CropCorn /> : null}
      {name === 'crop-quinoa' ? <CropQuinoa /> : null}
      {name === 'crop-alfalfa' ? <CropAlfalfa /> : null}
      {name === 'crop-bean' ? <CropBean /> : null}
    </Svg>
  );
}

function TextMark() {
  return (
    <G>
      <Rect x="36" y="42" width="30" height="4" rx="2" fill={palette.green} />
      <Rect x="36" y="52" width="48" height="4" rx="2" fill={palette.greenSoft} />
      <Rect x="36" y="62" width="38" height="4" rx="2" fill={palette.greenSoft} />
      <Circle cx="82" cy="44" r="8" fill={palette.sun} />
    </G>
  );
}

function CropCrop() {
  return (
    <Frame>
      <Ellipse cx="60" cy="76" rx="30" ry="24" fill={palette.earth} />
      <Path d="M60 52 C56 40 60 28 68 24" stroke={palette.green} strokeWidth="4" strokeLinecap="round" />
      <Path d="M66 34 C76 28 84 32 88 40 C78 44 70 42 66 34 Z" fill={palette.green} />
      <Path d="M48 68 C54 60 66 60 72 68" stroke={palette.earthSoft} strokeWidth="4" fill="none" />
    </Frame>
  );
}

function CropPumpkin() {
  return (
    <Frame>
      <Ellipse cx="60" cy="72" rx="34" ry="24" fill={palette.sun} />
      <Ellipse cx="60" cy="72" rx="20" ry="24" fill="#E6B85C" />
      <Path d="M60 48 C62 38 58 30 64 24" stroke={palette.green} strokeWidth="4" strokeLinecap="round" />
      <Path d="M66 32 C74 26 82 30 84 38 C76 42 68 40 66 32 Z" fill={palette.green} />
    </Frame>
  );
}

function CropChili() {
  return (
    <Frame>
      <Path d="M60 34 C78 34 88 52 82 72 C76 92 58 96 48 82 C38 68 42 44 60 34 Z" fill="#B84C3A" />
      <Path d="M60 34 C58 26 62 20 68 18" stroke={palette.green} strokeWidth="4" strokeLinecap="round" />
      <Path d="M68 18 C76 20 78 26 76 32" stroke={palette.green} strokeWidth="4" fill="none" strokeLinecap="round" />
    </Frame>
  );
}

function CropPotato() {
  return (
    <Frame>
      <Ellipse cx="60" cy="72" rx="32" ry="22" fill={palette.earthSoft} />
      <Ellipse cx="50" cy="66" rx="4" ry="3" fill={palette.earth} />
      <Ellipse cx="72" cy="74" rx="3" ry="2" fill={palette.earth} />
      <Ellipse cx="60" cy="82" rx="3" ry="2" fill={palette.earth} />
    </Frame>
  );
}

function CropCorn() {
  return (
    <Frame>
      <Rect x="52" y="28" width="18" height="56" rx="9" fill={palette.sun} />
      <Path d="M52 40 C40 42 36 54 42 66 C48 62 52 54 52 40 Z" fill={palette.green} />
      <Path d="M70 40 C82 42 86 54 80 66 C74 62 70 54 70 40 Z" fill={palette.greenLight} />
      <Line x1="60" y1="34" x2="60" y2="78" stroke={palette.earthSoft} strokeWidth="3" />
    </Frame>
  );
}

function CropQuinoa() {
  return (
    <Frame>
      <Path d="M60 86 V44" stroke={palette.earth} strokeWidth="4" strokeLinecap="round" />
      <Circle cx="46" cy="46" r="10" fill={palette.sun} />
      <Circle cx="60" cy="36" r="10" fill={palette.sun} />
      <Circle cx="74" cy="46" r="10" fill={palette.sun} />
      <Circle cx="46" cy="62" r="8" fill={palette.earthSoft} />
      <Circle cx="74" cy="62" r="8" fill={palette.earthSoft} />
    </Frame>
  );
}

function CropAlfalfa() {
  return (
    <Frame>
      <CropPlant x={40} />
      <CropPlant x={60} />
      <CropPlant x={80} />
      <Line x1="26" y1="92" x2="94" y2="92" stroke={palette.earth} strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

function CropBean() {
  return (
    <Frame>
      <Path d="M60 28 C82 38 88 64 72 84 C56 100 34 88 32 64 C30 46 44 34 60 28 Z" fill={palette.green} />
      <Path d="M56 38 C54 54 60 68 74 78" stroke={palette.greenSoft} strokeWidth="4" fill="none" />
      <Ellipse cx="50" cy="54" rx="5" ry="8" fill={palette.earthSoft} transform="rotate(-20 50 54)" />
      <Ellipse cx="64" cy="66" rx="5" ry="8" fill={palette.earthSoft} transform="rotate(-20 64 66)" />
    </Frame>
  );
}
