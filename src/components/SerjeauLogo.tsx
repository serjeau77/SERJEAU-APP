import React from 'react';

interface SerjeauLogoProps {
  variant?: 'topbar' | 'full';
}

export const SerjeauLogo: React.FC<SerjeauLogoProps> = ({ variant = 'topbar' }) => {
  if (variant === 'topbar') {
    return (
      <span className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
        <svg
          width="28"
          height="28"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect width="48" height="48" rx="10" fill="#0F1D3A" />
          {/* Stylized yellow and white S road emblem matching SERJEAU logo */}
          <path
            d="M35 12H20C14.5 12 11 15.2 11 19.5C11 23.8 14.5 26.2 20.5 26.8L27.5 27.5C30.5 27.8 32 29 32 31C32 33.2 29.8 34.5 25.5 34.5H12"
            stroke="#EAB308"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M36 18H23C19.5 18 17.5 19.2 17.5 21C17.5 22.8 19.5 23.8 23.5 24.2L29.5 24.8C34.5 25.3 37.5 28 37.5 32C37.5 36.5 33.5 39.5 26.5 39.5H13"
            stroke="#F8FAFC"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
        </svg>
        <span>SERJEAU Transporte Especial</span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-3.5">
      <svg
        width="46"
        height="46"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="48" height="48" rx="11" fill="#0F1D3A" />
        <path
          d="M35 12H20C14.5 12 11 15.2 11 19.5C11 23.8 14.5 26.2 20.5 26.8L27.5 27.5C30.5 27.8 32 29 32 31C32 33.2 29.8 34.5 25.5 34.5H12"
          stroke="#EAB308"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M36 18H23C19.5 18 17.5 19.2 17.5 21C17.5 22.8 19.5 23.8 23.5 24.2L29.5 24.8C34.5 25.3 37.5 28 37.5 32C37.5 36.5 33.5 39.5 26.5 39.5H13"
          stroke="#F8FAFC"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
      </svg>
      <div>
        <div className="text-xl font-extrabold tracking-wider text-slate-900 leading-none">
          SERJEAU
        </div>
        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-600 mt-0.5">
          TRANSPORTE ESPECIAL
        </div>
        <div className="text-xs italic font-medium text-amber-700 mt-0.5">
          Más que un viaje, es confianza
        </div>
      </div>
    </div>
  );
};
