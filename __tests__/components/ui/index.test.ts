/**
 * UI Component Library Index Tests
 *
 * Tests for the UI component library exports
 */

import {
  Button,
  ButtonGroup,
  Input,
  TextArea,
  Checkbox,
  Radio,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
  DarkModeToggle,
  DarkModeSwitch,
} from '../../../components/ui';

describe('UI Component Library Exports', () => {
  it('should export Button component', () => {
    expect(Button).toBeDefined();
  });

  it('should export ButtonGroup component', () => {
    expect(ButtonGroup).toBeDefined();
  });

  it('should export Input component', () => {
    expect(Input).toBeDefined();
  });

  it('should export TextArea component', () => {
    expect(TextArea).toBeDefined();
  });

  it('should export Checkbox component', () => {
    expect(Checkbox).toBeDefined();
  });

  it('should export Radio component', () => {
    expect(Radio).toBeDefined();
  });

  it('should export Card component', () => {
    expect(Card).toBeDefined();
  });

  it('should export CardHeader component', () => {
    expect(CardHeader).toBeDefined();
  });

  it('should export CardContent component', () => {
    expect(CardContent).toBeDefined();
  });

  it('should export CardFooter component', () => {
    expect(CardFooter).toBeDefined();
  });

  it('should export CardTitle component', () => {
    expect(CardTitle).toBeDefined();
  });

  it('should export CardDescription component', () => {
    expect(CardDescription).toBeDefined();
  });

  it('should export DarkModeToggle component', () => {
    expect(DarkModeToggle).toBeDefined();
  });

  it('should export DarkModeSwitch component', () => {
    expect(DarkModeSwitch).toBeDefined();
  });

  describe('Type exports', () => {
    it('should provide proper component types', () => {
      // This test ensures that TypeScript types are properly exported
      // The actual type checking is done at compile time
      expect(typeof Button).toBe('function');
      // Input components use forwardRef, which returns an object
      expect(Input).toBeDefined();
      expect(typeof Card).toBe('function');
      expect(typeof DarkModeToggle).toBe('function');
    });
  });
});
