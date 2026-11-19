import React from 'react';
import { Globe } from 'lucide-react';

// Bandiere in SVG: le emoji-bandiera NON si vedono su Windows (compaiono solo "IT", "GB"...).
const FLAGS = {
  IT: (
    <>
      <rect width="1" height="2" fill="#009246" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#ce2b37" />
    </>
  ),
  FR: (
    <>
      <rect width="1" height="2" fill="#0055a4" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#ef4135" />
    </>
  ),
  ES: (
    <>
      <rect width="3" height="2" fill="#aa151b" />
      <rect y="0.5" width="3" height="1" fill="#f1bf00" />
    </>
  ),
  DE: (
    <>
      <rect width="3" height="0.67" fill="#000" />
      <rect y="0.67" width="3" height="0.67" fill="#dd0000" />
      <rect y="1.33" width="3" height="0.67" fill="#ffce00" />
    </>
  ),
  CH: (
    <>
      <rect width="3" height="2" fill="#da291c" />
      <rect x="1.25" y="0.35" width="0.5" height="1.3" fill="#fff" />
      <rect x="0.85" y="0.75" width="1.3" height="0.5" fill="#fff" />
    </>
  ),
  UK: (
    <>
      <rect width="3" height="2" fill="#012169" />
      <path d="M0,0 L3,2 M3,0 L0,2" stroke="#fff" strokeWidth="0.4" />
      <path d="M0,0 L3,2 M3,0 L0,2" stroke="#c8102e" strokeWidth="0.2" />
      <path d="M1.5,0 V2 M0,1 H3" stroke="#fff" strokeWidth="0.67" />
      <path d="M1.5,0 V2 M0,1 H3" stroke="#c8102e" strokeWidth="0.4" />
    </>
  ),
};

export default function Flag({ code, className = '' }) {
  if (!FLAGS[code]) return <Globe className={`w-4 h-4 shrink-0 ${className}`} aria-hidden="true" />;
  return (
    <svg
      viewBox="0 0 3 2"
      preserveAspectRatio="none"
      width="20"
      height="14"
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-[3px] ring-1 ring-black/15 ${className}`}
    >
      {FLAGS[code]}
    </svg>
  );
}
