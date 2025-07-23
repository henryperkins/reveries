import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhancedInputBar from '../EnhancedInputBar';
import { vi } from 'vitest';

// Mock the usePromptSuggestions hook
vi.mock('@/hooks/usePromptSuggestions', () => ({
  usePromptSuggestions: vi.fn(() => ({
    suggestions: [
      { text: 'Test suggestion 1', type: 'memory' },
      { text: 'Test suggestion 2', type: 'tool' },
    ],
    isLoading: false,
  })),
}));

describe('EnhancedInputBar', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onChange: vi.fn(),
    onFocus: vi.fn(),
    onBlur: vi.fn(),
    onClear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the input bar with default props', () => {
      render(<EnhancedInputBar {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your research question...')).toBeInTheDocument();
      expect(screen.getByLabelText('Submit research question')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<EnhancedInputBar {...defaultProps} placeholder="Custom placeholder" />);

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('renders with custom aria-label', () => {
      render(<EnhancedInputBar {...defaultProps} aria-label="Custom label" />);

      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('renders disabled state', () => {
      render(<EnhancedInputBar {...defaultProps} disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByLabelText('Submit research question')).toBeDisabled();
    });

    it('renders loading state', () => {
      render(<EnhancedInputBar {...defaultProps} isLoading />);

      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByLabelText('Submit research question')).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('validates required field', async () => {
      const user = userEvent.setup();
      render(
        <EnhancedInputBar
          {...defaultProps}
          validationRules={[{ type: 'required', message: 'This field is required' }]}
        />
      );

      const input = screen.getByRole('textbox');
      const submitButton = screen.getByLabelText('Submit research question');

      await user.click(submitButton);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('validates minLength', async () => {
      const user = userEvent.setup();
      render(
        <EnhancedInputBar
          {...defaultProps}
          minLength={5}
        />
      );

      const input = screen.getByRole('textbox');
      const submitButton = screen.getByLabelText('Submit research question');

      await user.type(input, 'abc');
      await user.click(submitButton);

      expect(screen.getByText('Minimum length is 5 characters')).toBeInTheDocument();
    });

    it('validates maxLength', async () => {
      const user = userEvent.setup();
      render(
        <EnhancedInputBar
          {...defaultProps}
          maxLength={10}
        />
      );

      const input = screen.getByRole('textbox');

      await user.type(input, 'This is a very long text');

      expect(screen.getByText('11/10')).toBeInTheDocument();
      expect(screen.getByText('Maximum length is 10 characters')).toBeInTheDocument();
    });

    it('shows validation success', async () => {
      const user = userEvent.setup();
      render(
        <EnhancedInputBar
          {...defaultProps}
          minLength={3}
          maxLength={100}
        />
      );

      const input = screen.getByRole('textbox');

      await user.type(input, 'Valid input');

      expect(screen.queryByText('Minimum length is 3 characters')).not.toBeInTheDocument();
      expect(screen.queryByText('Maximum length is 100 characters')).not.toBeInTheDocument();
    });
  });

  describe('Auto-complete suggestions', () => {
    it('shows suggestions when focused and suggestions available', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');

      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      expect(screen.getByText('Test suggestion 1')).toBeInTheDocument();
      expect(screen.getByText('Test suggestion 2')).toBeInTheDocument();
    });

    it('applies suggestion on click', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');

      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('Test suggestion 1');
      await user.click(suggestion);

      expect(input).toHaveValue('Test suggestion 1');
    });

    it('navigates suggestions with keyboard', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');

      await user.click(input);
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByRole('option', { selected: true })).toBeInTheDocument();
      });
    });

    it('closes suggestions on escape', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');

      await user.click(input);
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dynamic placeholder hints', () => {
    it('cycles through dynamic placeholder hints', async () => {
      vi.useFakeTimers();

      render(
        <EnhancedInputBar
          {...defaultProps}
          dynamicPlaceholderHints={['Hint 1', 'Hint 2', 'Hint 3']}
        />
      );

      const input = screen.getByRole('textbox');

      expect(input).toHaveAttribute('placeholder', 'Hint 1');

      vi.advanceTimersByTime(3000);
      expect(input).toHaveAttribute('placeholder', 'Hint 2');

      vi.advanceTimersByTime(3000);
      expect(input).toHaveAttribute('placeholder', 'Hint 3');

      vi.advanceTimersByTime(3000);
      expect(input).toHaveAttribute('placeholder', 'Hint 1');

      vi.useRealTimers();
    });

    it('stops cycling when focused', async () => {
      vi.useFakeTimers();

      render(
        <EnhancedInputBar
          {...defaultProps}
          dynamicPlaceholderHints={['Hint 1', 'Hint 2']}
        />
      );

      const input = screen.getByRole('textbox');

      expect(input).toHaveAttribute('placeholder', 'Hint 1');

      fireEvent.focus(input);
      vi.advanceTimersByTime(3000);

      expect(input).toHaveAttribute('placeholder', 'Hint 1');

      vi.useRealTimers();
    });
  });

  describe('Ref methods', () => {
    it('exposes focus method', () => {
      const ref = React.createRef<any>();
      render(<EnhancedInputBar {...defaultProps} ref={ref} />);

      ref.current?.focus();

      expect(document.activeElement).toBe(screen.getByRole('textbox'));
    });

    it('exposes clear method', () => {
      const ref = React.createRef<any>();
      render(<EnhancedInputBar {...defaultProps} ref={ref} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      ref.current?.clear();

      expect(input).toHaveValue('');
    });

    it('exposes validate method', () => {
      const ref = React.createRef<any>();
      render(
        <EnhancedInputBar
          {...defaultProps}
          ref={ref}
          validationRules={[{ type: 'required', message: 'Required' }]}
        />
      );

      const isValid = ref.current?.validate();

      expect(isValid).toBe(false);
    });

    it('exposes getValue method', () => {
      const ref = React.createRef<any>();
      render(<EnhancedInputBar {...defaultProps} ref={ref} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test value' } });

      expect(ref.current?.getValue()).toBe('test value');
    });

    it('exposes setValue method', () => {
      const ref = React.createRef<any>();
      render(<EnhancedInputBar {...defaultProps} ref={ref} />);

      ref.current?.setValue('new value');

      expect(screen.getByRole('textbox')).toHaveValue('new value');
    });
  });

  describe('Event handling', () => {
    it('calls onChange when input changes', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello');

      expect(defaultProps.onChange).toHaveBeenCalledWith('Hello');
    });

    it('calls onFocus when input is focused', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(defaultProps.onFocus).toHaveBeenCalled();
    });

    it('calls onBlur when input loses focus', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();

      expect(defaultProps.onBlur).toHaveBeenCalled();
    });

    it('calls onSubmit with valid input', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      const submitButton = screen.getByLabelText('Submit research question');

      await user.type(input, 'Valid research question');
      await user.click(submitButton);

      expect(defaultProps.onSubmit).toHaveBeenCalledWith('Valid research question');
    });

    it('clears input after successful submission', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      const submitButton = screen.getByLabelText('Submit research question');

      await user.type(input, 'Test question');
      await user.click(submitButton);

      expect(input).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');

      expect(input).toHaveAttribute('aria-label', 'Research question input');
      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('announces validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(
        <EnhancedInputBar
          {...defaultProps}
          validationRules={[{ type: 'required', message: 'This field is required' }]}
        />
      );

      const submitButton = screen.getByLabelText('Submit research question');
      await user.click(submitButton);

      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<EnhancedInputBar {...defaultProps} />);

      const input = screen.getByRole('textbox');

      await user.click(input);
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(input).toHaveValue('Test suggestion 1');
    });
  });
});
