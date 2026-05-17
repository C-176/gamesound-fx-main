interface PixelIconProps {
  size?: number;
  color?: string;
}

function pixelate(pixels: string[], fill: string, cols?: number) {
  const w = cols || Math.max(...pixels.map(r => r.length));
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${pixels.length}`} shapeRendering="crispEdges" preserveAspectRatio="xMidYMid meet">
      {pixels.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch !== '.' ? <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={ch === '#' ? fill : ch === 'o' ? 'currentColor' : ch} /> : null
        )
      )}
    </svg>
  );
}

export function PixelIcon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <span className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

/* ─── Gamepad (16x12) ─── */
export function Gamepad({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '................',
        '......####......',
        '....########....',
        '...##########...',
        '..##..####..##..',
        '.##..##..##..##.',
        '.##..##..##..##.',
        '..############..',
        '...##########...',
        '.....##..##.....',
        '.....##..##.....',
        '................',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Globe/Satellite (16x14) ─── */
export function Globe({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '......####......',
        '....########....',
        '...##.##.##.##..',
        '..##..###...##..',
        '.##...###....##.',
        '.##..#####...##.',
        '.##.######..##..',
        '..##.####..###..',
        '...##.##..###...',
        '....##.##.##....',
        '.....#####.##...',
        '.....##..##.....',
        '....##..##......',
        '...##..##.......',
      ], color)}
    </PixelIcon>
  );
}

/* ─── 8-bit Star (14x14) ─── */
export function PixelStar({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '..............',
        '......##......',
        '.....#..#.....',
        '.....#..#.....',
        '...########...',
        '..##.##.##.##..',
        '.##..####..##.',
        '.##..####..##.',
        '..##.##.##.##..',
        '...########...',
        '.....#..#.....',
        '.....#..#.....',
        '......##......',
        '..............',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Music Note (8x16) ─── */
export function MusicNote({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '........',
        '..##....',
        '..##....',
        '..##....',
        '..##....',
        '..##....',
        '..##....',
        '..##....',
        '..##....',
        '..##....',
        '########',
        '########',
        '..##..##',
        '..##..##',
        '..####..',
        '..####..',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Ghost (12x14) ─── */
export function PixelGhost({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '....####....',
        '..########..',
        '.##.##.##.##.',
        '.##.##.##.##.',
        '.##........##.',
        '.##..##.##.##.',
        '.##..##.##.##.',
        '.##........##.',
        '.##..##..##.##.',
        '.##..##..##.##.',
        '.##........##.',
        '..##......##..',
        '...##.##.##...',
        '....########....',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Skull (12x12) ─── */
export function Skull({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '....####....',
        '..########..',
        '.##......##.',
        '.##.##.##.##.',
        '.##.##.##.##.',
        '.##......##.',
        '.##..##..##.',
        '.##......##.',
        '..########..',
        '....#..#....',
        '....#..#....',
        '...######...',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Cassette Tape (16x12) ─── */
export function Cassette({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '..##########..',
        '.############.',
        '##..........##',
        '##.##....##.##',
        '##.##....##.##',
        '##..........##',
        '##.##....##.##',
        '##.##....##.##',
        '##..........##',
        '##..######..##',
        '.############.',
        '..##########..',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Heart (14x12) ─── */
export function PixelHeart({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '.....##.##.....',
        '..###..##.###..',
        '.##....##....##.',
        '.##.........##.',
        '.##.........##.',
        '..##.......##..',
        '...##.....##...',
        '....##...##....',
        '.....##.##.....',
        '......###......',
        '.......#.......',
        '..............',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Lightning Bolt (8x14) ─── */
export function Lightning({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '..##....',
        '..###...',
        '..###...',
        '..####..',
        '..####..',
        '..#####.',
        '..#####.',
        '..######',
        '..######',
        '...#####',
        '....####',
        '.....##',
        '.....##',
        '.....##',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Speaker (16x14) ─── */
export function PixelSpeaker({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '..............',
        '.......##.....',
        '.....##.##....',
        '...##..###....',
        '..##..#####...',
        '.##..#######..',
        '.##..#######..',
        '.##..#######..',
        '.##..#######..',
        '..##..#####...',
        '...##..###....',
        '.....##.##....',
        '.......##.....',
        '..............',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Muted Speaker (16x14) ─── */
export function PixelMuted({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '..............',
        '.......##.##..',
        '.....##...##..',
        '...##..##.##..',
        '..##..##..##..',
        '.##..##...##..',
        '.##.##....##..',
        '.##.##....##..',
        '.##..##...##..',
        '..##..##..##..',
        '...##..##.##..',
        '.....##...##..',
        '.......##.##..',
        '..............',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Retro TV / Monitor (16x14) ─── */
export function RetroTV({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '.....##.##.....',
        '..##########..',
        '.##........##.',
        '##..########..#',
        '##..########..#',
        '##..########..#',
        '##..########..#',
        '##..########..#',
        '##..########..#',
        '##..########..#',
        '##..........##',
        '.##........##.',
        '..##########..',
        '.....##.##.....',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Pixel "CD" / Disc (14x14) ─── */
export function PixelDisc({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '.....#####.....',
        '...#########...',
        '..####.#######..',
        '.#####...#####.',
        '.#####...#####.',
        '.#####...#####.',
        '..####..#####..',
        '.#####..#####..',
        '.#####...#####.',
        '.#####...#####.',
        '..####..#####..',
        '...#########...',
        '.....#####.....',
        '..............',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Party Popper / Confetti (14x14) ─── */
export function PartyPopper({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '....##....##...',
        '.....##..##....',
        '......####.....',
        '.....######....',
        '.....#....#....',
        '....##.##.##...',
        '...#..#..#..#..',
        '..#..#..#..#..#',
        '.#..#..#..#..#.',
        '..#..#..#..#..',
        '...#..#..#..#..',
        '....#..#..#...',
        '.....#..#.....',
        '......##......',
      ], color)}
    </PixelIcon>
  );
}

export function Folder({ size = 16, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '..##########..',
        '.#..........#.',
        '#..##..##..##.',
        '.#..........#.',
        '.#..........#.',
        '.#..........#.',
        '.#..........#.',
        '..##########..',
        '..............',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Saturn — ringed planet (14x8) ─── */
export function Saturn({ size = 16, color = '#ffcc33' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '.....##.##......',
        '...#########....',
        '..##..###..##...',
        '.##..#####..##..',
        '##..#######..##.',
        '.##..#####..##..',
        '..##..###..##...',
        '...#########....',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Rocket (8x14) ─── */
export function Rocket({ size = 16, color = '#0cf' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '...##...',
        '..####..',
        '.######.',
        '..####..',
        '..####..',
        '..####..',
        '.##.##..',
        '.##.##..',
        '.##.##..',
        '..####..',
        '..####..',
        '..#..#..',
        '..#..#..',
        '..#..#..',
      ], color)}
    </PixelIcon>
  );
}

/* ─── UFO / Flying Saucer (12x6) ─── */
export function UFO({ size = 16, color = '#0e5' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '....#..#....',
        '..########..',
        '.##########.',
        '##.#.##.#.##',
        '.##########.',
        '..########..',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Crescent Moon (10x10) ─── */
export function Crescent({ size = 16, color = '#ffcc33' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '....######',
        '..######..',
        '.####.....',
        '.####.....',
        '..####....',
        '...####...',
        '....####..',
        '.....#####',
        '......####',
        '.......###',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Sun with rays (12x12) ─── */
export function Sun({ size = 16, color = '#ffcc33' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '....#..#....',
        '....####....',
        '..#......#..',
        '.#..####..#.',
        '.#..####..#.',
        '.#..####..#.',
        '.#..####..#.',
        '.#..####..#.',
        '..#......#..',
        '....####....',
        '....#..#....',
        '............',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Shooting Star / Meteor (14x6) ─── */
export function Comet({ size = 16, color = '#0cf' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '.....##........',
        '.....###.#.....',
        '..#..#######...',
        '..##########.#.',
        '....########...',
        '......##.......',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Pixel Alien (10x8) ─── */
export function Alien({ size = 16, color = '#0e5' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '..########..',
        '.##......##.',
        '##.#.##.#.##',
        '##..#..#..##',
        '##..####..##',
        '##........##',
        '.##......##.',
        '..##....##..',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Satellite / Radar (12x10) ─── */
export function Satellite({ size = 16, color = '#c04dff' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '.....#...#...',
        '....####....',
        '.....#.#....',
        '....#####...',
        '..##..##..##.',
        '.##..###..##.',
        '..##..##..##.',
        '....#####...',
        '.....#.#....',
        '.....#.#....',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Planet with Orbit Ring (12x8) ─── */
export function Orbit({ size = 16, color = '#c04dff' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '...########..',
        '..##.....##..',
        '.##..###..##.',
        '##..#####..##',
        '##..#####..#.',
        '.##..###..#..',
        '..##.....#...',
        '...######....',
      ], color)}
    </PixelIcon>
  );
}

/* ─── Play Triangle (8x8) ─── */
export function PlayTriangle({ size = 14, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '..##....',
        '..###...',
        '..####..',
        '..#####.',
        '..#####.',
        '..####..',
        '..###...',
        '..##....',
      ], color, 8)}
    </PixelIcon>
  );
}

/* ─── Stop Square (8x8) ─── */
export function StopSquare({ size = 14, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '########',
        '########',
        '########',
        '########',
        '########',
        '########',
        '########',
        '########',
      ], color, 8)}
    </PixelIcon>
  );
}

/* ─── Checkmark (8x8) ─── */
export function Checkmark({ size = 12, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '........',
        '......##',
        '.....##.',
        '....##..',
        '.##.##..',
        '..###...',
        '...#....',
        '........',
      ], color, 8)}
    </PixelIcon>
  );
}

/* ─── Close X (8x8) ─── */
export function CloseX({ size = 12, color = 'currentColor' }: PixelIconProps) {
  return (
    <PixelIcon size={size}>
      {pixelate([
        '##....##',
        '.##..##.',
        '..####..',
        '...##...',
        '..####..',
        '.##..##.',
        '##....##',
        '........',
      ], color, 8)}
    </PixelIcon>
  );
}
