import React from 'react';
import CurrentClassCard from './CurrentClassCard';
import NextClassCard from './NextClassCard';

export const ClassSpotlightRow = ({ currentClass, nextClass, onOpenSubstitution }) => {
  return (
    <section className="fp-classes-spotlight-row" aria-label="Current and Next Class Overview">
      <CurrentClassCard
        session={currentClass}
        onOpenSubstitution={onOpenSubstitution}
      />
      <NextClassCard
        session={nextClass}
        onOpenSubstitution={onOpenSubstitution}
      />
    </section>
  );
};

export default ClassSpotlightRow;
