import React from 'react';
import { ChatBubbleLeftRightIcon, CpuChipIcon, QuestionMarkCircleIcon, GlobeAltIcon, SparklesIcon } from '../icons';

interface FeatureItemProps {
  icon: React.ElementType;
  text: string;
  delay?: number;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon: Icon, text, delay = 0 }) => (
  <li
    className="flex gap-3 p-4 rounded-lg bg-surface hover:bg-surface/80 transition-all duration-200 hover:shadow-md animate-fade-in group"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="shrink-0 w-6 h-6 text-accent mt-0.5 transition-transform duration-200 group-hover:scale-110">
      <Icon />
    </div>
    <span className="text-text-secondary leading-relaxed">{text}</span>
  </li>
);

export const FeaturesList: React.FC = () => {
  const features = [
    {
      icon: ChatBubbleLeftRightIcon,
      text: "Client-side AI agent that orchestrates a research narrative to answer queries"
    },
    {
      icon: CpuChipIcon,
      text: "Dynamically generates adaptive search strategies based on query complexity"
    },
    {
      icon: GlobeAltIcon,
      text: "Performs web research via integrated search capabilities"
    },
    {
      icon: SparklesIcon,
      text: "Reflects on findings to identify knowledge gaps and refine results"
    },
    {
      icon: QuestionMarkCircleIcon,
      text: "Self-healing mechanisms detect and recover from incomplete results"
    },
  ];

  return (
    <section className="mt-16 pt-12 border-t border-border">
      <h2 className="text-3xl font-serif text-text-primary mb-8 text-center">
        Capabilities
      </h2>
      <ul className="space-y-3 max-w-3xl mx-auto">
        {features.map((feature, index) => (
          <FeatureItem
            key={index}
            icon={feature.icon}
            text={feature.text}
            delay={index * 100}
          />
        ))}
      </ul>
    </section>
  );
};
