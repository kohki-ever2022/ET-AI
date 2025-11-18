/**
 * Input Component Tests
 *
 * Tests for the Apple HIG-compliant Input component
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input, TextArea, Checkbox, Radio } from '../../../components/ui/Input';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-apple');
    });

    it('should be full width by default', () => {
      const { container } = render(<Input />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('w-full');
    });

    it('should not be full width when fullWidth is false', () => {
      const { container } = render(<Input fullWidth={false} />);
      const wrapper = container.firstChild;
      expect(wrapper).not.toHaveClass('w-full');
    });

    it('should accept custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('Label', () => {
    it('should not render label by default', () => {
      const { container } = render(<Input />);
      const label = container.querySelector('label');
      expect(label).not.toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(<Input label="Username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should associate label with input', () => {
      render(<Input label="Username" id="username-input" />);
      const label = screen.getByText('Username');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', 'username-input');
      expect(input).toHaveAttribute('id', 'username-input');
    });

    it('should generate id when not provided', () => {
      render(<Input label="Username" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id');
      expect(input.id).toMatch(/^input-/);
    });
  });

  describe('Error State', () => {
    it('should not show error by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('input-apple-error');
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('should show error class when error is provided', () => {
      render(<Input error="This field is required" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-apple-error');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should render error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have role alert for error message', () => {
      render(<Input error="Error message" />);
      const errorMsg = screen.getByText('Error message');
      expect(errorMsg).toHaveAttribute('role', 'alert');
    });

    it('should associate error with input via aria-describedby', () => {
      render(<Input id="test-input" error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });
  });

  describe('Helper Text', () => {
    it('should not render helper text by default', () => {
      const { container } = render(<Input />);
      const helperText = container.querySelector('.text-tertiary');
      expect(helperText).not.toBeInTheDocument();
    });

    it('should render helper text when provided', () => {
      render(<Input helperText="Enter your username" />);
      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('should associate helper text with input via aria-describedby', () => {
      render(<Input id="test-input" helperText="Helper text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
    });

    it('should not render helper text when error is present', () => {
      render(<Input error="Error" helperText="Helper text" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render left icon when provided', () => {
      render(<Input leftIcon={<span data-testid="left-icon">🔍</span>} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon when provided', () => {
      render(<Input rightIcon={<span data-testid="right-icon">✓</span>} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should apply padding when left icon is present', () => {
      render(<Input leftIcon={<span>🔍</span>} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-12');
    });

    it('should apply padding when right icon is present', () => {
      render(<Input rightIcon={<span>✓</span>} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-12');
    });

    it('should render both icons simultaneously', () => {
      render(
        <Input
          leftIcon={<span data-testid="left-icon">🔍</span>}
          rightIcon={<span data-testid="right-icon">✓</span>}
        />
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('Input Props', () => {
    it('should accept type attribute', () => {
      const { container } = render(<Input type="password" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should accept placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should accept value', () => {
      render(<Input value="test value" onChange={() => {}} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('test value');
    });

    it('should accept disabled attribute', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should accept required attribute', () => {
      render(<Input required />);
      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('should accept readOnly attribute', () => {
      render(<Input readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readOnly');
    });
  });

  describe('Events', () => {
    it('should call onChange handler', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should call onFocus handler', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');

      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur handler', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');

      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.tagName).toBe('INPUT');
    });

    it('should allow focusing input via ref', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Complete Example', () => {
    it('should render input with all features', () => {
      render(
        <Input
          id="complete-input"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          helperText="We'll never share your email"
          leftIcon={<span data-testid="email-icon">✉️</span>}
          required
        />
      );

      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
      expect(screen.getByTestId('email-icon')).toBeInTheDocument();

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('type', 'email');
    });
  });
});

describe('TextArea Component', () => {
  describe('Basic Rendering', () => {
    it('should render a textarea element', () => {
      render(<TextArea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should apply default rows', () => {
      render(<TextArea />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(4);
    });

    it('should accept custom rows', () => {
      render(<TextArea rows={10} />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(10);
    });

    it('should be resizable', () => {
      render(<TextArea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('resize-y');
    });
  });

  describe('Label', () => {
    it('should render label when provided', () => {
      render(<TextArea label="Description" />);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should generate id when not provided', () => {
      render(<TextArea label="Description" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id');
      expect(textarea.id).toMatch(/^textarea-/);
    });

    it('should use provided id', () => {
      render(<TextArea label="Description" id="custom-textarea" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id', 'custom-textarea');
    });
  });

  describe('Error State', () => {
    it('should show error class when error is provided', () => {
      render(<TextArea error="This field is required" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('input-apple-error');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should render error message', () => {
      render(<TextArea error="Required field" />);
      expect(screen.getByText('Required field')).toBeInTheDocument();
    });

    it('should associate error with textarea', () => {
      render(<TextArea id="test-textarea" error="Error message" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'test-textarea-error');
    });
  });

  describe('Helper Text', () => {
    it('should render helper text when provided', () => {
      render(<TextArea helperText="Maximum 500 characters" />);
      expect(screen.getByText('Maximum 500 characters')).toBeInTheDocument();
    });

    it('should not show helper text when error is present', () => {
      render(<TextArea error="Error" helperText="Helper" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to textarea element', () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<TextArea ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
      expect(ref.current?.tagName).toBe('TEXTAREA');
    });
  });
});

describe('Checkbox Component', () => {
  describe('Basic Rendering', () => {
    it('should render a checkbox input', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('should generate id when not provided', () => {
      render(<Checkbox label="Accept terms" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id');
      expect(checkbox.id).toMatch(/^checkbox-/);
    });

    it('should use provided id', () => {
      render(<Checkbox id="custom-checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id', 'custom-checkbox');
    });
  });

  describe('Label', () => {
    it('should render label when provided', () => {
      render(<Checkbox label="I agree to terms" />);
      expect(screen.getByText('I agree to terms')).toBeInTheDocument();
    });

    it('should associate label with checkbox', () => {
      render(<Checkbox label="Accept" id="terms-checkbox" />);
      const label = screen.getByText('Accept');
      const checkbox = screen.getByRole('checkbox');
      expect(label).toHaveAttribute('for', 'terms-checkbox');
      expect(checkbox).toHaveAttribute('id', 'terms-checkbox');
    });

    it('should work without label', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be unchecked by default', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should accept checked prop', () => {
      render(<Checkbox checked onChange={() => {}} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should accept disabled prop', () => {
      render(<Checkbox disabled />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });
  });

  describe('Events', () => {
    it('should call onChange when clicked', () => {
      const handleChange = jest.fn();
      render(<Checkbox onChange={handleChange} />);
      const checkbox = screen.getByRole('checkbox');

      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to checkbox input', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Checkbox ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.type).toBe('checkbox');
    });
  });
});

describe('Radio Component', () => {
  describe('Basic Rendering', () => {
    it('should render a radio input', () => {
      render(<Radio />);
      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
      expect(radio).toHaveAttribute('type', 'radio');
    });

    it('should generate id when not provided', () => {
      render(<Radio label="Option A" />);
      const radio = screen.getByRole('radio');
      expect(radio).toHaveAttribute('id');
      expect(radio.id).toMatch(/^radio-/);
    });

    it('should use provided id', () => {
      render(<Radio id="custom-radio" />);
      const radio = screen.getByRole('radio');
      expect(radio).toHaveAttribute('id', 'custom-radio');
    });
  });

  describe('Label', () => {
    it('should render label when provided', () => {
      render(<Radio label="Option 1" />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('should associate label with radio button', () => {
      render(<Radio label="Select this" id="radio-1" />);
      const label = screen.getByText('Select this');
      const radio = screen.getByRole('radio');
      expect(label).toHaveAttribute('for', 'radio-1');
      expect(radio).toHaveAttribute('id', 'radio-1');
    });

    it('should work without label', () => {
      render(<Radio />);
      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be unchecked by default', () => {
      render(<Radio />);
      const radio = screen.getByRole('radio') as HTMLInputElement;
      expect(radio.checked).toBe(false);
    });

    it('should accept checked prop', () => {
      render(<Radio checked onChange={() => {}} />);
      const radio = screen.getByRole('radio') as HTMLInputElement;
      expect(radio.checked).toBe(true);
    });

    it('should accept disabled prop', () => {
      render(<Radio disabled />);
      const radio = screen.getByRole('radio');
      expect(radio).toBeDisabled();
    });

    it('should accept name prop for grouping', () => {
      render(
        <div>
          <Radio name="group1" />
          <Radio name="group1" />
        </div>
      );
      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toHaveAttribute('name', 'group1');
      expect(radios[1]).toHaveAttribute('name', 'group1');
    });
  });

  describe('Events', () => {
    it('should call onChange when clicked', () => {
      const handleChange = jest.fn();
      render(<Radio onChange={handleChange} />);
      const radio = screen.getByRole('radio');

      fireEvent.click(radio);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to radio input', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Radio ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.type).toBe('radio');
    });
  });
});
