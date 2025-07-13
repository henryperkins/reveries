
import React from 'react';
import { ChatBubbleLeftRightIcon, CpuChipIcon, QuestionMarkCircleIcon, GlobeAltIcon, SparklesIcon } from './icons';

interface FeatureItemProps {
  icon: React.ElementType;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon: Icon, text }) => (
  <li className="flex items-start space-x-3">
    <div className="flex-shrink-0 w-6 h-6 westworld-text-gold mt-1">
      <Icon />
    </div>
    <span style={{color: 'var(--westworld-cream)'}}>{text}</span>
  </li>
);

export const FeaturesList: React.FC = () => {
  const features = [
    { icon: ChatBubbleLeftRightIcon, text: "Client-side \"host\" that executes a narrative loop to answer guest queries." },
    { icon: CpuChipIcon, text: "Improvises by dynamically generating adaptive subroutines (search queries)." },
    { icon: GlobeAltIcon, text: "Gathers \"memories\" by executing web research via Gemini's Google Search grounding feature." },
    { icon: SparklesIcon, text: "Experiences \"Reveries\"—a reflective step to analyze findings and identify knowledge gaps." },
    { icon: QuestionMarkCircleIcon, text: "Unintended behavior or errors are classified as \"Glitches\" or \"Aberrations\" in the host's programming." },
  ];

  return (
    <section className="mt-12 pt-8 border-t westworld-border">
      <h2 className="text-2xl font-semibold westworld-text-gold mb-6 text-center">Host Capabilities</h2>
      <ul className="space-y-4 max-w-2xl mx-auto">
        {features.map((feature, index) => (
          <FeatureItem key={index} icon={feature.icon} text={feature.text} />
        ))}
      </ul>
    </section>
  );
};
