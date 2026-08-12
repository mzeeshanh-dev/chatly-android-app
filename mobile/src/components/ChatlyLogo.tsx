import React from 'react';
import Svg, { Rect, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

export function ChatlyLogo({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <SvgLinearGradient id="emerald-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#20E7D2" />
          <Stop offset="1" stopColor="#10B981" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="100" height="100" rx="28" fill="url(#emerald-grad)" />
      <Path
        d="M50 20C30.67 20 15 32.6 15 48.15C15 56.4 18.9 63.82 25.1 69.1C24.3 75.1 20.8 82.2 16 86.8C23.6 86.2 31.8 82.1 36.8 77.2C40.9 78.4 45.3 79.1 50 79.1C69.33 79.1 85 66.5 85 50.95C85 35.4 69.33 20 50 20Z"
        fill="#030706"
      />
      <Path
        d="M62 42C58.8 38.5 54.2 36.5 49 36.5C39 36.5 32 44 32 52.5C32 61 39 68.5 49 68.5C54.2 68.5 58.8 66.5 62 63"
        stroke="#20E7D2"
        strokeWidth={8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
