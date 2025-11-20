/**
 * Card Component Tests
 *
 * Tests for the Apple HIG-compliant Card component family
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from '../../../components/ui/Card';

describe('Card Component', () => {
  describe('Card', () => {
    it('should render children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('card-apple');
    });

    it('should apply hover class when hover prop is true', () => {
      const { container } = render(<Card hover>Content</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('card-apple-hover');
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
    });

    it('should not be clickable by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      expect(card).not.toHaveClass('cursor-pointer');
      expect(card).not.toHaveAttribute('role', 'button');
    });

    it('should be clickable when onClick is provided', () => {
      const handleClick = jest.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);
      const card = container.firstChild as HTMLElement;

      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Enter key is pressed', () => {
      const handleClick = jest.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);
      const card = container.firstChild as HTMLElement;

      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Space key is pressed', () => {
      const handleClick = jest.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);
      const card = container.firstChild as HTMLElement;

      fireEvent.keyDown(card, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick for other keys', () => {
      const handleClick = jest.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);
      const card = container.firstChild as HTMLElement;

      fireEvent.keyDown(card, { key: 'A' });
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('CardHeader', () => {
    it('should render children', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild;
      expect(header).toHaveClass('p-apple-base');
      expect(header).toHaveClass('border-b');
    });

    it('should apply custom className', () => {
      const { container } = render(<CardHeader className="custom-header">Header</CardHeader>);
      const header = container.firstChild;
      expect(header).toHaveClass('custom-header');
    });

    it('should render action element when provided', () => {
      render(
        <CardHeader action={<button>Action</button>}>
          Header
        </CardHeader>
      );
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should not render action container when action is not provided', () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const actionContainer = container.querySelector('.ml-apple-md');
      expect(actionContainer).not.toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('should render children', () => {
      render(<CardContent>Content Text</CardContent>);
      expect(screen.getByText('Content Text')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.firstChild;
      expect(content).toHaveClass('p-apple-base');
      expect(content).toHaveClass('space-y-apple-md');
    });

    it('should apply custom className', () => {
      const { container } = render(<CardContent className="custom-content">Content</CardContent>);
      const content = container.firstChild;
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('should render children', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild;
      expect(footer).toHaveClass('p-apple-base');
      expect(footer).toHaveClass('border-t');
    });

    it('should apply custom className', () => {
      const { container } = render(<CardFooter className="custom-footer">Footer</CardFooter>);
      const footer = container.firstChild;
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('CardTitle', () => {
    it('should render children', () => {
      render(<CardTitle>Title Text</CardTitle>);
      expect(screen.getByText('Title Text')).toBeInTheDocument();
    });

    it('should render as h3 element', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title.tagName).toBe('H3');
    });

    it('should apply default classes', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title).toHaveClass('font-sf-pro');
      expect(title).toHaveClass('text-apple-headline');
      expect(title).toHaveClass('text-primary');
    });

    it('should apply custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('should render children', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should render as p element', () => {
      render(<CardDescription>Description</CardDescription>);
      const description = screen.getByText('Description');
      expect(description.tagName).toBe('P');
    });

    it('should apply default classes', () => {
      render(<CardDescription>Description</CardDescription>);
      const description = screen.getByText('Description');
      expect(description).toHaveClass('font-sf-pro');
      expect(description).toHaveClass('text-apple-body');
      expect(description).toHaveClass('text-secondary');
    });

    it('should apply custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>);
      const description = screen.getByText('Description');
      expect(description).toHaveClass('custom-desc');
    });
  });

  describe('Card composition', () => {
    it('should render a complete card with all subcomponents', () => {
      render(
        <Card>
          <CardHeader action={<button>Edit</button>}>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>This is a description</CardDescription>
          </CardContent>
          <CardFooter>Footer content</CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('This is a description')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });
});
