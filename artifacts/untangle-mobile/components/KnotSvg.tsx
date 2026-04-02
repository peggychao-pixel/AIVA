import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface KnotSvgProps {
  size?: number;
  loose?: boolean;
}

export function KnotSvg({ size = 120, loose = false }: KnotSvgProps) {
  const colors = useColors();
  const strokeWidth = loose ? 2 : 3;
  const opacity = loose ? 0.4 : 0.65;
  const color = colors.primary;

  if (loose) {
    return (
      <Svg width={size} height={size * 0.7} viewBox="0 0 200 140">
        <Path
          d="M20,70 C40,30 80,20 100,70 C120,120 160,110 180,70"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={opacity}
          strokeLinecap="round"
        />
        <Path
          d="M30,90 C60,50 90,55 110,90 C130,125 165,115 175,90"
          stroke={color}
          strokeWidth={strokeWidth - 0.5}
          fill="none"
          opacity={opacity * 0.7}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path
        d="M100,20 C130,20 155,40 155,70 C155,100 130,115 100,115"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
      />
      <Path
        d="M100,115 C70,115 45,100 45,70 C45,40 70,20 100,20"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
      />
      <Path
        d="M100,115 C100,140 80,165 60,175"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
      />
      <Path
        d="M100,115 C105,140 125,160 145,168"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity * 0.8}
        strokeLinecap="round"
      />
      <Circle
        cx="100"
        cy="70"
        r="5"
        fill={color}
        opacity={opacity * 0.6}
      />
    </Svg>
  );
}
