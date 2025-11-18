/**
 * Button Component Tests
 *
 * Tests for the Apple HIG-compliant Button component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button, ButtonGroup } from '../../../components/ui/Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render with default variant (primary)', () => {
      const { container } = render(<Button>Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('btn-apple-primary');
    });

    it('should render with secondary variant', () => {
      const { container } = render(<Button variant="secondary">Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('btn-apple-secondary');
    });

    it('should render with text variant', () => {
      const { container } = render(<Button variant="text">Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('btn-apple-text');
    });

    it('should render with capsule variant', () => {
      const { container } = render(<Button variant="capsule">Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('btn-apple-capsule');
    });

    it('should render with destructive variant', () => {
      const { container } = render(<Button variant="destructive">Delete</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('btn-apple-primary');
    });
  });

  describe('Sizes', () => {
    it('should render with default size (medium)', () => {
      const { container } = render(<Button>Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('px-apple-lg');
    });

    it('should render with small size', () => {
      const { container } = render(<Button size="small">Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('px-apple-md');
      expect(button).toHaveClass('text-apple-subhead');
    });

    it('should render with large size', () => {
      const { container } = render(<Button size="large">Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('px-apple-xl');
      expect(button).toHaveClass('text-apple-headline');
    });
  });

  describe('Full Width', () => {
    it('should not be full width by default', () => {
      const { container } = render(<Button>Button</Button>);
      const button = container.querySelector('button');
      expect(button).not.toHaveClass('w-full');
    });

    it('should render with full width', () => {
      const { container } = render(<Button fullWidth>Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Loading State', () => {
    it('should not be in loading state by default', () => {
      render(<Button>Button</Button>);
      const button = screen.getByText('Button');
      expect(button).not.toHaveAttribute('aria-busy', 'true');
    });

    it('should show loading state', () => {
      const { container } = render(<Button loading>Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-busy');
      expect(button).toBeDisabled();
    });

    it('should have opacity class when loading', () => {
      const { container } = render(<Button loading>Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Disabled State', () => {
    it('should not be disabled by default', () => {
      render(<Button>Button</Button>);
      const button = screen.getByText('Button');
      expect(button).not.toBeDisabled();
    });

    it('should be disabled', () => {
      render(<Button disabled>Button</Button>);
      const button = screen.getByText('Button');
      expect(button).toBeDisabled();
    });

    it('should have opacity class when disabled', () => {
      const { container } = render(<Button disabled>Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Interactions', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      const button = screen.getByText('Button');

      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Button</Button>);
      const button = screen.getByText('Button');

      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} loading>Button</Button>);
      const button = screen.getByText('Button');

      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<Button className="custom-class">Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should accept type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByText('Submit');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should accept aria-label', () => {
      render(<Button aria-label="Custom Label">Button</Button>);
      const button = screen.getByLabelText('Custom Label');
      expect(button).toBeInTheDocument();
    });
  });

  describe('ButtonGroup', () => {
    it('should render children', () => {
      const { container } = render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );

      expect(screen.getByText('Button 1')).toBeInTheDocument();
      expect(screen.getByText('Button 2')).toBeInTheDocument();
      expect(container.querySelector('[role="group"]')).toBeInTheDocument();
    });

    it('should apply default flex layout', () => {
      const { container } = render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );

      const group = container.querySelector('[role="group"]');
      expect(group).toHaveClass('flex', 'gap-apple-sm');
    });

    it('should accept custom className', () => {
      const { container } = render(
        <ButtonGroup className="custom-class">
          <Button>Button 1</Button>
        </ButtonGroup>
      );

      const group = container.querySelector('[role="group"]');
      expect(group).toHaveClass('custom-class');
    });

    it('should render with default empty className when not provided', () => {
      const { container } = render(
        <ButtonGroup>
          <Button>Button</Button>
        </ButtonGroup>
      );

      const group = container.querySelector('[role="group"]');
      expect(group).toBeInTheDocument();
    });
  });
});
