interface IconProps {
  size?: number;
  color?: string;
}

function IconBase({ size = 16, children, color = 'currentColor' }: { size?: number; children: React.ReactNode; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Gamepad({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M8 12h4M10 10v4" /><circle cx="16.5" cy="11" r="1" /><circle cx="18.5" cy="13" r="1" /></IconBase>;
}
export function Globe({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></IconBase>;
}
export function PixelStar({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="m12 3 2.6 5.2 5.7.8-4.1 4 1 5.7L12 16l-5.2 2.7 1-5.7-4.1-4 5.7-.8Z" /></IconBase>;
}
export function MusicNote({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="M14 5v10.5a2.5 2.5 0 1 1-1.8-2.4V7l7-2v8.5a2.5 2.5 0 1 1-1.8-2.4V5z" /></IconBase>;
}
export function Skull({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="M12 3c4.4 0 8 3.1 8 7v3a2 2 0 0 1-2 2h-1v3h-2v-2h-2v2h-2v-2H9v2H7v-3H6a2 2 0 0 1-2-2v-3c0-3.9 3.6-7 8-7Z" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /></IconBase>;
}
export function Cassette({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="1.8" /><circle cx="15" cy="11" r="1.8" /><path d="M7 16h10" /></IconBase>;
}
export function Lightning({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="M13 2 5 13h6l-1 9 8-11h-6z" /></IconBase>;
}
export function PixelSpeaker({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="M4 10h4l5-4v12l-5-4H4z" /><path d="M17 9a4 4 0 0 1 0 6" /></IconBase>;
}
export function PixelMuted({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="M4 10h4l5-4v12l-5-4H4z" /><path d="m16 10 4 4m0-4-4 4" /></IconBase>;
}
export function RetroTV({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 3h8M12 6v12" /></IconBase>;
}
export function Folder({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></IconBase>;
}
export function Saturn({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><circle cx="12" cy="12" r="4" /><path d="M3 13c3-3 15-3 18 0M5 15c4 2 10 2 14 0" /></IconBase>;
}
export function Rocket({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="M14 4c3 1 5 4 6 7-3 1-6 3-7 6-2-2-4-4-6-7 3-1 5-3 7-6Z" /><circle cx="15" cy="9" r="1" /><path d="M7 17 4 20m5-1-2 3" /></IconBase>;
}
export function UFO({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><ellipse cx="12" cy="13" rx="8" ry="3.5" /><path d="M8 12c0-2 1.8-4 4-4s4 2 4 4" /></IconBase>;
}
export function Alien({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="M12 4c3.5 0 6 2.8 6 6.3 0 3-2 5.7-6 8.7-4-3-6-5.7-6-8.7C6 6.8 8.5 4 12 4Z" /><circle cx="9.5" cy="10.5" r="1" /><circle cx="14.5" cy="10.5" r="1" /></IconBase>;
}
export const PixelGhost = Alien;
export function Satellite({ size = 16, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><rect x="10" y="9" width="4" height="6" rx="1" /><path d="M4 10h4v4H4zm12 0h4v4h-4zM12 6v3m0 6v3" /></IconBase>;
}
export function PlayTriangle({ size = 14, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="m8 5 8 7-8 7z" /></IconBase>;
}
export function StopSquare({ size = 14, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><rect x="6" y="6" width="12" height="12" rx="2" /></IconBase>;
}
export function Checkmark({ size = 12, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="m5 12 4 4 10-10" /></IconBase>;
}
export function CloseX({ size = 12, color = 'currentColor' }: IconProps) {
  return <IconBase size={size} color={color}><path d="m6 6 12 12M18 6 6 18" /></IconBase>;
}
