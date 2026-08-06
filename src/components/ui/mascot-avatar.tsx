import { useMemo } from "react";

type MascotType =
  | "harimau"
  | "orangutan"
  | "komodo"
  | "cenderawasih"
  | "bekantan"
  | "gajah"
  | "badak"
  | "elang";

const MASCOTS: MascotType[] = [
  "harimau",
  "orangutan",
  "komodo",
  "cenderawasih",
  "bekantan",
  "gajah",
  "badak",
  "elang",
];

function getMascotIndex(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % MASCOTS.length;
}

export function IndonesianAnimalMascot({
  seed,
  name,
  className = "w-full h-full",
}: {
  seed: string;
  name?: string;
  className?: string;
}) {
  const index = useMemo(
    () => getMascotIndex(seed || name || "default"),
    [seed, name],
  );
  const mascot = MASCOTS[index];

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Harimau Sumatera */}
      {mascot === "harimau" && (
        <>
          <circle cx="50" cy="50" r="50" fill="#FFEFE6" />
          <circle cx="24" cy="24" r="13" fill="#FF7E27" />
          <circle cx="24" cy="24" r="7" fill="#FFCBB3" />
          <circle cx="76" cy="24" r="13" fill="#FF7E27" />
          <circle cx="76" cy="24" r="7" fill="#FFCBB3" />
          <circle cx="50" cy="54" r="32" fill="#FF7E27" />
          <ellipse cx="38" cy="62" rx="12" ry="9" fill="#FFFFFF" />
          <ellipse cx="62" cy="62" rx="12" ry="9" fill="#FFFFFF" />
          <path d="M50 24V34" stroke="#2D1C10" strokeWidth="4" strokeLinecap="round" />
          <path d="M42 28L47 34" stroke="#2D1C10" strokeWidth="3" strokeLinecap="round" />
          <path d="M58 28L53 34" stroke="#2D1C10" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 50H30" stroke="#2D1C10" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M78 50H70" stroke="#2D1C10" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="36" cy="48" r="4.5" fill="#2D1C10" />
          <circle cx="37.5" cy="46.5" r="1.5" fill="#FFFFFF" />
          <circle cx="64" cy="48" r="4.5" fill="#2D1C10" />
          <circle cx="65.5" cy="46.5" r="1.5" fill="#FFFFFF" />
          <polygon points="50,56 44,50 56,50" fill="#FF6584" />
          <path d="M50 56V61M50 61C47 61 44 59 44 57M50 61C53 61 56 59 56 57" stroke="#2D1C10" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="28" cy="55" r="4" fill="#FF9EAA" opacity="0.6" />
          <circle cx="72" cy="55" r="4" fill="#FF9EAA" opacity="0.6" />
        </>
      )}

      {/* Orangutan */}
      {mascot === "orangutan" && (
        <>
          <circle cx="50" cy="50" r="50" fill="#FFF4EC" />
          <circle cx="50" cy="52" r="36" fill="#C85217" />
          <circle cx="22" cy="52" r="14" fill="#C85217" />
          <circle cx="78" cy="52" r="14" fill="#C85217" />
          <path d="M50 28C36 28 30 38 30 52C30 68 38 76 50 76C62 76 70 68 70 52C70 38 64 28 50 28Z" fill="#FCE2CE" />
          <circle cx="28" cy="56" r="8" fill="#F3C3A5" />
          <circle cx="72" cy="56" r="8" fill="#F3C3A5" />
          <circle cx="40" cy="46" r="4" fill="#3A1C0C" />
          <circle cx="41" cy="44.5" r="1.2" fill="#FFFFFF" />
          <circle cx="60" cy="46" r="4" fill="#3A1C0C" />
          <circle cx="61" cy="44.5" r="1.2" fill="#FFFFFF" />
          <ellipse cx="50" cy="54" rx="4" ry="2.5" fill="#B2653E" />
          <path d="M44 63C47 66 53 66 56 63" stroke="#3A1C0C" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="34" cy="54" r="3.5" fill="#FF9EAA" opacity="0.7" />
          <circle cx="66" cy="54" r="3.5" fill="#FF9EAA" opacity="0.7" />
        </>
      )}

      {/* Komodo */}
      {mascot === "komodo" && (
        <>
          <circle cx="50" cy="50" r="50" fill="#F0F7EE" />
          <path d="M50 22C32 22 26 38 26 56C26 72 38 80 50 80C62 80 74 72 74 56C74 38 68 22 50 22Z" fill="#7AA04A" />
          <ellipse cx="50" cy="62" rx="20" ry="14" fill="#93B860" />
          <circle cx="43" cy="58" r="2" fill="#3D5620" />
          <circle cx="57" cy="58" r="2" fill="#3D5620" />
          <circle cx="37" cy="40" r="5" fill="#3D5620" />
          <circle cx="38.5" cy="38.5" r="1.8" fill="#FFFFFF" />
          <circle cx="63" cy="40" r="5" fill="#3D5620" />
          <circle cx="64.5" cy="38.5" r="1.8" fill="#FFFFFF" />
          <path d="M40 67C45 71 55 71 60 67" stroke="#2D4215" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 69V75M50 75L46 79M50 75L54 79" stroke="#FF5252" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="52" r="4.5" fill="#FF90A4" opacity="0.6" />
          <circle cx="70" cy="52" r="4.5" fill="#FF90A4" opacity="0.6" />
        </>
      )}

      {/* Cenderawasih */}
      {mascot === "cenderawasih" && (
        <>
          <circle cx="50" cy="50" r="50" fill="#FFFBE6" />
          <path d="M42 22C42 12 50 8 50 8C50 8 58 12 58 22Z" fill="#FFC72C" />
          <path d="M34 26C30 18 38 12 38 12C38 12 44 18 42 26Z" fill="#FF9800" />
          <path d="M66 26C70 18 62 12 62 12C62 12 56 18 58 26Z" fill="#FF9800" />
          <circle cx="50" cy="48" r="28" fill="#FFC72C" />
          <path d="M32 54C32 68 40 76 50 76C60 76 68 68 68 54Z" fill="#00A86B" />
          <circle cx="38" cy="42" r="4.5" fill="#1C2833" />
          <circle cx="39.5" cy="40.5" r="1.5" fill="#FFFFFF" />
          <circle cx="62" cy="42" r="4.5" fill="#1C2833" />
          <circle cx="63.5" cy="40.5" r="1.5" fill="#FFFFFF" />
          <polygon points="50,44 43,53 57,53" fill="#FF5722" />
          <circle cx="30" cy="48" r="4" fill="#FF9800" opacity="0.5" />
          <circle cx="70" cy="48" r="4" fill="#FF9800" opacity="0.5" />
        </>
      )}

      {/* Bekantan */}
      {mascot === "bekantan" && (
        <>
          <circle cx="50" cy="50" r="50" fill="#FAF0E6" />
          <circle cx="50" cy="48" r="34" fill="#D9822B" />
          <circle cx="50" cy="52" r="24" fill="#FCE4D6" />
          <ellipse cx="50" cy="56" rx="10" ry="14" fill="#E07A5F" />
          <ellipse cx="50" cy="52" rx="7" ry="9" fill="#F4A261" />
          <circle cx="36" cy="42" r="4" fill="#2C1810" />
          <circle cx="37" cy="40.5" r="1.2" fill="#FFFFFF" />
          <circle cx="64" cy="42" r="4" fill="#2C1810" />
          <circle cx="65" cy="40.5" r="1.2" fill="#FFFFFF" />
          <path d="M45 68C48 70 52 70 55 68" stroke="#2C1810" strokeWidth="2" strokeLinecap="round" />
          <circle cx="26" cy="50" r="4" fill="#FF8A8A" opacity="0.6" />
          <circle cx="74" cy="50" r="4" fill="#FF8A8A" opacity="0.6" />
        </>
      )}

      {/* Gajah Sumatera */}
      {mascot === "gajah" && (
        <>
          <circle cx="50" cy="50" r="50" fill="#F2F4F8" />
          <circle cx="20" cy="48" r="18" fill="#A0AAB8" />
          <circle cx="20" cy="48" r="11" fill="#F3C4D3" />
          <circle cx="80" cy="48" r="18" fill="#A0AAB8" />
          <circle cx="80" cy="48" r="11" fill="#F3C4D3" />
          <circle cx="50" cy="50" r="30" fill="#B0B9C6" />
          <circle cx="37" cy="44" r="4" fill="#1E2530" />
          <circle cx="38.5" cy="42.5" r="1.3" fill="#FFFFFF" />
          <circle cx="63" cy="44" r="4" fill="#1E2530" />
          <circle cx="64.5" cy="42.5" r="1.3" fill="#FFFFFF" />
          <path d="M50 50C50 64 42 66 42 72C42 76 47 78 52 76" stroke="#B0B9C6" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M50 50C50 64 42 66 42 72C42 76 47 78 52 76" stroke="#9AA4B3" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M42 58L36 64" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <path d="M58 58L64 64" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="50" r="4" fill="#FF8A8A" opacity="0.6" />
          <circle cx="70" cy="50" r="4" fill="#FF8A8A" opacity="0.6" />
        </>
      )}

      {/* Badak Jawa */}
      {mascot === "badak" && (
        <>
          <circle cx="50" cy="50" r="50" fill="#F4F5F7" />
          <ellipse cx="32" cy="24" rx="6" ry="10" transform="rotate(-20 32 24)" fill="#8C98A6" />
          <ellipse cx="68" cy="24" rx="6" ry="10" transform="rotate(20 68 24)" fill="#8C98A6" />
          <circle cx="50" cy="52" r="32" fill="#9AA7B5" />
          <ellipse cx="50" cy="62" rx="20" ry="14" fill="#B0BDCC" />
          <path d="M50 42L44 56H56Z" fill="#F5EBE6" />
          <circle cx="36" cy="46" r="4" fill="#242B35" />
          <circle cx="37" cy="44.5" r="1.2" fill="#FFFFFF" />
          <circle cx="64" cy="46" r="4" fill="#242B35" />
          <circle cx="65" cy="44.5" r="1.2" fill="#FFFFFF" />
          <path d="M44 67C47 69 53 69 56 67" stroke="#242B35" strokeWidth="2" strokeLinecap="round" />
          <circle cx="28" cy="54" r="4" fill="#FFA4B6" opacity="0.6" />
          <circle cx="72" cy="54" r="4" fill="#FFA4B6" opacity="0.6" />
        </>
      )}

      {/* Elang Jawa */}
      {mascot === "elang" && (
        <>
          <circle cx="50" cy="50" r="50" fill="#FFF9F2" />
          <path d="M50 10L42 28H58Z" fill="#8B4513" />
          <path d="M50 14L45 28H55Z" fill="#D2691E" />
          <circle cx="50" cy="48" r="28" fill="#F8F1E5" />
          <path d="M22 56C22 70 34 76 50 76C66 76 78 70 78 56Z" fill="#8B4513" />
          <circle cx="38" cy="42" r="4.5" fill="#2C1810" />
          <circle cx="39.5" cy="40.5" r="1.5" fill="#FFFFFF" />
          <circle cx="62" cy="42" r="4.5" fill="#2C1810" />
          <circle cx="63.5" cy="40.5" r="1.5" fill="#FFFFFF" />
          <path d="M44 48C44 48 50 48 50 58C50 58 56 48 56 48Z" fill="#FFA000" />
          <path d="M50 48V58L54 54" stroke="#E65100" strokeWidth="1.5" />
          <circle cx="30" cy="48" r="3.5" fill="#FF8A8A" opacity="0.6" />
          <circle cx="70" cy="48" r="3.5" fill="#FF8A8A" opacity="0.6" />
        </>
      )}
    </svg>
  );
}
