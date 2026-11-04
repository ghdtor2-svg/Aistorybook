import { Season } from "./design";
/** Lightweight SVG companion to the procedural 3D mascots; no WebGL required. */
export default function MascotPortrait({ season }: { season: Season }) {
  return (
    <svg viewBox="0 0 64 64" width="38" height="38" aria-hidden="true">
      {season === "winter" ? (
        <>
          <path
            d="M32 5 38 15 49 11 48 24 60 29 50 38 53 50 40 49 32 60 24 49 11 51 14 38 4 30 16 24 15 11 27 15Z"
            fill="#c0e2ef"
            stroke="#eefaff"
            strokeWidth="3"
          />
          <circle cx="32" cy="32" r="18" fill="#eff9fc" />
        </>
      ) : season === "spring" ? (
        <>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i * Math.PI * 2) / 5;
            return (
              <ellipse
                key={i}
                cx={32 + Math.sin(a) * 15}
                cy={30 - Math.cos(a) * 15}
                rx="11"
                ry="14"
                fill={i % 2 ? "#efb0c0" : "#f5c1ce"}
                transform={`rotate(${i * 72},${32 + Math.sin(a) * 15},${30 - Math.cos(a) * 15})`}
              />
            );
          })}
          <circle cx="32" cy="31" r="15" fill="#f8dfa0" />
        </>
      ) : season === "summer" ? (
        <>
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse
              key={i}
              cx="32"
              cy="11"
              rx="5"
              ry="10"
              fill="#efbd57"
              transform={`rotate(${i * 45},32,32)`}
            />
          ))}
          <circle cx="32" cy="32" r="21" fill="#ffdc7f" />
        </>
      ) : (
        <>
          <path
            d="M32 56C8 47 8 41 15 35L5 24 20 25 16 10 29 17 34 5 41 19 56 13 51 30 61 32C55 48 46 52 32 56Z"
            fill="#e6a16f"
          />
          <path d="M32 58 35 15" stroke="#f2c48f" strokeWidth="2" />
          <path
            d="M35 10Q36 4 42 5"
            stroke="#916442"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
      <ellipse cx="25" cy="30" rx="2.5" ry="3.1" fill="#39342e" />
      <ellipse cx="40" cy="30" rx="2.5" ry="3.1" fill="#39342e" />
      <ellipse cx="21" cy="37" rx="4" ry="2.5" fill="#eaa49b" />
      <ellipse cx="44" cy="37" rx="4" ry="2.5" fill="#eaa49b" />
      <path
        d="M29 36Q32 41 36 36"
        fill="none"
        stroke="#795346"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {season === "winter" && (
        <g fill="none" stroke="#496077" strokeWidth="1.6">
          <circle cx="25" cy="30" r="6.5" />
          <circle cx="40" cy="30" r="6.5" />
          <path d="M31.5 30h2" />
        </g>
      )}
    </svg>
  );
}
