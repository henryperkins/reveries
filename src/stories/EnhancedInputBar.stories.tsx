import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import EnhancedInputBar from '../components/EnhancedInputBar';
import type { HostParadigm } from '../types';

const meta: Meta<typeof EnhancedInputBar> = {
  title: 'Components/EnhancedInputBar',
  component: EnhancedInputBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A fully accessible, responsive input bar component with real-time validation,
dynamic placeholder hints, auto-complete suggestions, and comprehensive keyboard/screen-reader support.

## Features
- **Real-time validation** with customizable rules
- **Auto-complete suggestions** powered by AI
- **Dynamic placeholder hints** that cycle automatically
- **Full accessibility** with ARIA attributes and screen reader support
- **Responsive design** that works on all screen sizes
- **Keyboard navigation** with arrow keys, tab, and escape
- **Ref API** for programmatic control
- **Theme integration** with design system tokens

## Usage
\`\`\`tsx
import EnhancedInputBar from '@/components/EnhancedInputBar';

function MyComponent() {
  const handleSubmit = (value: string) => {
    console.log('Submitted:', value);
  };

  return (
    <EnhancedInputBar
      onSubmit={handleSubmit}
      placeholder="Enter your research question..."
      validationRules={[
        { type: 'required', message: 'This field is required' },
        { type: 'minLength', value: 5, message: 'Minimum 5 characters' }
      ]}
    />
  );
}
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    onSubmit: { action: 'submitted' },
    onChange: { action: 'changed' },
    onFocus: { action: 'focused' },
    onBlur: { action: 'blurred' },
    onClear: { action: 'cleared' },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the input',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    maxLength: {
      control: 'number',
      description: 'Maximum character length',
    },
    minLength: {
      control: 'number',
      description: 'Minimum character length',
    },
    validationRules: {
      control: 'object',
      description: 'Array of validation rules',
    },
    autoCompleteSuggestions: {
      control: 'object',
      description: 'Array of auto-complete suggestions',
    },
    dynamicPlaceholderHints: {
      control: 'object',
      description: 'Array of dynamic placeholder hints',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    placeholder: 'Enter your research question...',
  },
};

// With validation
export const WithValidation: Story = {
  args: {
    placeholder: 'Enter your research question...',
    validationRules: [
      { type: 'required', message: 'This field is required' },
      { type: 'minLength', value: 10, message: 'Minimum 10 characters required' },
      { type: 'maxLength', value: 200, message: 'Maximum 200 characters allowed' },
    ],
  },
};

// With auto-complete suggestions
export const WithAutoComplete: Story = {
  args: {
    placeholder: 'Enter your research question...',
    autoCompleteSuggestions: [
      'How does quantum computing work?',
      'What are the latest developments in AI?',
      'Explain blockchain technology',
      'What is the future of renewable energy?',
      'How does machine learning impact healthcare?',
    ],
  },
};

// With dynamic placeholder hints
export const WithDynamicHints: Story = {
  args: {
    placeholder: 'Enter your research question...',
    dynamicPlaceholderHints: [
      'Ask about quantum computing...',
      'Explore AI developments...',
      'Discover blockchain insights...',
      'Research renewable energy...',
      'Investigate ML in healthcare...',
    ],
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    placeholder: 'This input is disabled',
    disabled: true,
  },
};

// Loading state
export const Loading: Story = {
  args: {
    placeholder: 'Loading suggestions...',
    isLoading: true,
  },
};

// With AI suggestions (mocked)
export const WithAISuggestions: Story = {
  args: {
    placeholder: 'Enter your research question...',
    currentParadigm: 'analytical' as HostParadigm,
    paradigmProbabilities: {
      analytical: 0.4,
      creative: 0.3,
      collaborative: 0.2,
      critical: 0.1,
    },
  },
};

// Full featured
export const FullFeatured: Story = {
  args: {
    placeholder: 'Enter your research question...',
    validationRules: [
      { type: 'required', message: 'This field is required' },
      { type: 'minLength', value: 5, message: 'Minimum 5 characters required' },
    ],
    autoCompleteSuggestions: [
      'How does quantum computing work?',
      'What are the latest developments in AI?',
      'Explain blockchain technology',
    ],
    dynamicPlaceholderHints: [
      'Ask about quantum computing...',
      'Explore AI developments...',
      'Discover blockchain insights...',
    ],
    maxLength: 500,
    minLength: 5,
  },
};

// Dark theme
export const DarkTheme: Story = {
  args: {
    placeholder: 'Enter your research question...',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1512' },
      ],
    },
  },
};

// Mobile responsive
export const Mobile: Story = {
  args: {
    placeholder: 'Enter your research question...',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

// Tablet responsive
export const Tablet: Story = {
  args: {
    placeholder: 'Enter your research question...',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};
