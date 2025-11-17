/**
 * Apple Human Interface Guidelines (HIG) UI Component Library
 *
 * このライブラリは、Apple HIGの2024-2025年版に基づいた
 * 再利用可能なUIコンポーネントを提供します。
 *
 * すべてのコンポーネントは以下の基準を満たしています：
 * - WCAG 2.1 AAレベルのアクセシビリティ
 * - 44×44pxの最小タッチターゲット
 * - ライト・ダークモード対応
 * - Reduce Motion対応
 * - セマンティックカラーの使用
 */

export { Button, ButtonGroup, type ButtonProps, type ButtonGroupProps } from './Button';
export {
  Input,
  TextArea,
  Checkbox,
  Radio,
  type InputProps,
  type TextAreaProps,
  type CheckboxProps,
  type RadioProps
} from './Input';
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
  type CardProps,
  type CardHeaderProps,
  type CardContentProps,
  type CardFooterProps,
  type CardTitleProps,
  type CardDescriptionProps,
} from './Card';
export { DarkModeToggle, DarkModeSwitch } from './DarkModeToggle';
