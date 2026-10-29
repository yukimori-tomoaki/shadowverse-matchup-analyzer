"use client";

import React, { useState } from "react";
import type { ClassKey } from "@/types/classIcon";
import { CLASS_METAS, getClassKeyFromName, getDeckClassKey } from "@/constants/classIcons";

export type ClassIconProps = {
  classKey?: ClassKey;
  className?: string; // Japanese class name, e.g. "エルフ"
  deckName?: string;  // e.g. "テンポエルフ"
  customUrl?: string | null;
  size?: number;
  showBadge?: boolean;
  style?: React.CSSProperties;
};

// Beautiful vector SVG motifs for Shadowverse classes
function DefaultSvgIcon({ classKey, size }: { classKey: ClassKey; size: number }) {
  const meta = CLASS_METAS[classKey];
  const color = meta.themeColor;

  switch (classKey) {
    case "elf":
      // Forestcraft Leaf / Tree
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill={color} fillOpacity="0.2" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case "royal":
      // Swordcraft Crown / Shield
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" fill={color} fillOpacity="0.2" />
        </svg>
      );
    case "witch":
      // Runecraft Arcane Star / Magic Spark
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" strokeOpacity="0.4" />
          <polygon points="12 4 14.5 9.5 20 12 14.5 14.5 12 20 9.5 14.5 4 12 9.5 9.5 12 4" fill={color} fillOpacity="0.3" />
        </svg>
      );
    case "dragon":
      // Dragoncraft Flame / Breath
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill={color} fillOpacity="0.2" />
        </svg>
      );
    case "nightmare":
      // Abysscraft Crescent Moon & Bat Wing
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} fillOpacity="0.25" />
          <circle cx="12" cy="12" r="2" fill={color} />
        </svg>
      );
    case "bishop":
      // Havencraft Holy Cross & Rays
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M6 8h12M9 14h6" />
          <circle cx="12" cy="8" r="4" fill={color} fillOpacity="0.2" />
        </svg>
      );
    case "nemesis":
      // Portalcraft Dimensional Portal / Hexagon
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" fill={color} fillOpacity="0.2" />
          <circle cx="12" cy="12" r="3" fill={color} fillOpacity="0.4" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export function ClassIcon({
  classKey: directKey,
  className: classNameProp,
  deckName,
  customUrl,
  size = 22,
  showBadge = false,
  style,
}: ClassIconProps) {
  const [imgError, setImgError] = useState(false);

  // Resolve class key
  let resolvedKey: ClassKey | null = directKey ?? null;
  if (!resolvedKey && classNameProp) {
    resolvedKey = getClassKeyFromName(classNameProp);
  }
  if (!resolvedKey && deckName) {
    resolvedKey = getDeckClassKey(deckName);
  }

  if (!resolvedKey) {
    return null;
  }

  const meta = CLASS_METAS[resolvedKey];
  const innerSize = Math.max(14, Math.round(size * 0.72));

  const content = (
    <div
      className={`class-icon-wrapper ${resolvedKey}`}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        borderRadius: "50%",
        overflow: "hidden",
        backgroundColor: showBadge ? meta.badgeBg : "transparent",
        border: showBadge ? `1px solid ${meta.borderColor}` : "none",
        ...style,
      }}
      title={meta.name}
    >
      {customUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={customUrl}
          alt={meta.name}
          width={size}
          height={size}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      ) : (
        <DefaultSvgIcon classKey={resolvedKey} size={innerSize} />
      )}
    </div>
  );

  return content;
}
