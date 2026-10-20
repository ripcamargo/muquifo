import type { ReactNode } from 'react';

interface SectionHeadProps {
  index: string;
  eyebrow: string;
  title: ReactNode;
  id: string;
  children?: ReactNode;
}

/** Cabeçalho de seção numerado, como faixas de um disco: "01 / O estúdio". */
export function SectionHead({ index, eyebrow, title, id, children }: SectionHeadProps) {
  return (
    <header className="mq-section-head">
      <p className="mq-section-head__eyebrow mq-label">
        {index} / {eyebrow}
      </p>
      <h2 id={id} className="mq-display mq-section-head__title">
        {title}
      </h2>
      {children && <p className="mq-section-head__lead">{children}</p>}
    </header>
  );
}
