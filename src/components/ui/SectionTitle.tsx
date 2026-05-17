import type { ReactNode } from 'react';

interface SectionTitleProps {
  icon?: ReactNode;
  children: ReactNode;
  variant?: 'cyan' | 'accent' | 'danger';
}

function SectionTitle({ icon, children, variant = 'cyan' }: SectionTitleProps) {
  const colorClass =
    variant === 'danger' ? 'text-accent-red' : variant === 'accent' ? 'text-accent' : 'text-accent-cyan';

  return (
    <h3 className={`section-title font-pixel ${colorClass}`}>
      {icon ? <span className="section-title-icon">{icon}</span> : null}
      <span>{children}</span>
    </h3>
  );
}

export default SectionTitle;
