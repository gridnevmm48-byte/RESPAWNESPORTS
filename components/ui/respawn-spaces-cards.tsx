"use client";

import { FC, ReactNode } from "react";
import { Cpu, Crown, Gamepad2, Clapperboard, Wind } from "lucide-react";

/**
 * RespawnSpacesCards — the on-brand alternative to the neon SkewCards.
 *
 * Same "skewed panel straightens on hover" idea, retuned to the RESPAWN
 * brief: near-black canvas, ONE amber accent (#F5B457 → #FF7A18), a cool
 * gold for VIP, restrained motion. Reads as premium, not RGB.
 *
 * Design tokens (kept on the 4px system):
 *   radius 16px · card 300x400 · gap 24px · pad 32px
 */

type Space = {
  title: string;
  desc: string;
  icon: ReactNode;
  accent?: "amber" | "gold";
};

const SPACES: Space[] = [
  { title: "Premium PC", desc: "i7 & i9 rigs on 2K high-refresh panels. Nothing between you and the frame.", icon: <Cpu className="h-6 w-6" strokeWidth={1.5} /> },
  { title: "VIP Room", desc: "Your own corner of the island. Superlight gear, 260Hz, a door you can close.", icon: <Crown className="h-6 w-6" strokeWidth={1.5} />, accent: "gold" },
  { title: "PS5 Lounge", desc: "PS5 Pro, recliners and friends. The couch you wish you had at home.", icon: <Gamepad2 className="h-6 w-6" strokeWidth={1.5} /> },
  { title: "Private Cinema", desc: "A 130-inch screen and Dolby Atmos. Dim the lights — the rest disappears.", icon: <Clapperboard className="h-6 w-6" strokeWidth={1.5} /> },
  { title: "Hookah Lounge", desc: "Play. Pause. Indulge. A slow corner for the moments between rounds.", icon: <Wind className="h-6 w-6" strokeWidth={1.5} /> },
];

const RespawnCard: FC<Space> = ({ title, desc, icon, accent = "amber" }) => {
  const glow =
    accent === "gold"
      ? "from-[#E8C270]/25 to-[#B8935A]/10"
      : "from-[#F5B457]/25 to-[#FF7A18]/10";
  const ink = accent === "gold" ? "text-[#E8C270]" : "text-[#F5B457]";

  return (
    <div className="group relative h-[400px] w-[300px]">
      {/* skewed accent panel — straightens & spreads on hover */}
      <span
        className={`absolute inset-y-0 left-[42px] w-1/2 rounded-2xl bg-gradient-to-br ${glow} skew-x-[14deg] blur-[2px] transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:left-[16px] group-hover:w-[calc(100%-32px)] group-hover:skew-x-0`}
      />
      <span
        className={`absolute inset-y-0 left-[42px] w-1/2 rounded-2xl bg-gradient-to-br ${glow} skew-x-[14deg] opacity-40 blur-[34px] transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:left-[16px] group-hover:w-[calc(100%-32px)] group-hover:skew-x-0`}
      />

      {/* content card */}
      <div className="relative z-10 flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-[#0d0d10]/80 p-8 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:border-white/20 group-hover:-translate-y-1">
        <div className={`grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/50 ${ink} transition-transform duration-500 group-hover:scale-110`}>
          {icon}
        </div>

        <div>
          <h3 className="mb-3 font-[var(--font-display,inherit)] text-2xl font-medium tracking-tight text-[#F4F2ED]">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-[#B8B7B2]">{desc}</p>
        </div>

        <span className={`h-px w-10 origin-left rounded-full bg-current ${ink} opacity-60 transition-all duration-500 group-hover:w-20 group-hover:opacity-100`} />
      </div>
    </div>
  );
};

export const RespawnSpacesCards: FC = () => {
  return (
    <div className="flex min-h-screen flex-wrap items-center justify-center gap-6 bg-[#0a0a0c] p-10">
      {SPACES.map((s) => (
        <RespawnCard key={s.title} {...s} />
      ))}
    </div>
  );
};

export default RespawnSpacesCards;
