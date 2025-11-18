/**
 * Icons Component Tests
 *
 * Tests for icon components with default and custom className props
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  TriasLogo,
  WorkspaceIcon,
  ChatIcon,
  UploadIcon,
  DocumentIcon,
  DeleteIcon,
  SendIcon,
  BotIcon,
  UserIcon,
  LogoutIcon,
  SpinnerIcon,
  PlusIcon,
  QuoteIcon,
  ProjectIcon,
  ArrowLeftIcon,
  SidebarToggleIcon,
  FileIcon,
  ChevronRightIcon,
  XIcon,
  SearchIcon,
  UserCircleIcon,
  PaperclipIcon,
  ExportIcon,
  ErrorIcon,
  ExclamationIcon,
} from '../../components/Icons';

describe('Icons', () => {
  describe('TriasLogo', () => {
    it('should render with default className', () => {
      const { container } = render(<TriasLogo />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-10', 'h-10');
    });

    it('should render with custom className', () => {
      const { container } = render(<TriasLogo className="w-20 h-20" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-20', 'h-20');
    });

    it('should contain gradient definition', () => {
      const { container } = render(<TriasLogo />);
      const gradient = container.querySelector('#logoGradient');
      expect(gradient).toBeInTheDocument();
    });
  });

  describe('WorkspaceIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<WorkspaceIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<WorkspaceIcon className="w-8 h-8" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8');
    });
  });

  describe('ChatIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<ChatIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<ChatIcon className="w-10 h-10" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-10', 'h-10');
    });
  });

  describe('UploadIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<UploadIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<UploadIcon className="custom-class" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-class');
    });
  });

  describe('DocumentIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<DocumentIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<DocumentIcon className="text-blue-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-500');
    });
  });

  describe('DeleteIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<DeleteIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<DeleteIcon className="text-red-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-red-500');
    });
  });

  describe('SendIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<SendIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<SendIcon className="w-4 h-4" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });
  });

  describe('BotIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<BotIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8');
    });

    it('should render with custom className', () => {
      const { container } = render(<BotIcon className="w-12 h-12" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-12', 'h-12');
    });
  });

  describe('UserIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<UserIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8');
    });

    it('should render with custom className', () => {
      const { container } = render(<UserIcon className="w-16 h-16" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-16', 'h-16');
    });
  });

  describe('LogoutIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<LogoutIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<LogoutIcon className="text-gray-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-gray-500');
    });
  });

  describe('SpinnerIcon', () => {
    it('should render with default className and animate', () => {
      const { container } = render(<SpinnerIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5', 'animate-spin', 'motion-reduce:animate-none');
    });

    it('should render with custom className', () => {
      const { container } = render(<SpinnerIcon className="w-8 h-8" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8', 'animate-spin');
    });
  });

  describe('PlusIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<PlusIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('should render with custom className', () => {
      const { container } = render(<PlusIcon className="w-6 h-6" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });
  });

  describe('QuoteIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<QuoteIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('should render with custom className', () => {
      const { container } = render(<QuoteIcon className="text-gray-400" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-gray-400');
    });
  });

  describe('ProjectIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<ProjectIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<ProjectIcon className="w-8 h-8" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8');
    });
  });

  describe('ArrowLeftIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<ArrowLeftIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<ArrowLeftIcon className="text-blue-600" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-600');
    });
  });

  describe('SidebarToggleIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<SidebarToggleIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<SidebarToggleIcon className="w-5 h-5" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });
  });

  describe('FileIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<FileIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<FileIcon className="text-green-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-green-500');
    });
  });

  describe('ChevronRightIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<ChevronRightIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('should render with custom className', () => {
      const { container } = render(<ChevronRightIcon className="w-6 h-6" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });
  });

  describe('XIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<XIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<XIcon className="text-red-600" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-red-600');
    });
  });

  describe('SearchIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<SearchIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('should render with custom className', () => {
      const { container } = render(<SearchIcon className="w-7 h-7" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-7', 'h-7');
    });
  });

  describe('UserCircleIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<UserCircleIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<UserCircleIcon className="w-10 h-10" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-10', 'h-10');
    });
  });

  describe('PaperclipIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<PaperclipIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      const { container } = render(<PaperclipIcon className="text-gray-600" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-gray-600');
    });
  });

  describe('ExportIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<ExportIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('should render with custom className', () => {
      const { container } = render(<ExportIcon className="w-6 h-6" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });
  });

  describe('ErrorIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<ErrorIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('should render with custom className', () => {
      const { container } = render(<ErrorIcon className="text-red-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-red-500');
    });
  });

  describe('ExclamationIcon', () => {
    it('should render with default className', () => {
      const { container } = render(<ExclamationIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('should render with custom className', () => {
      const { container } = render(<ExclamationIcon className="text-yellow-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-yellow-500');
    });
  });
});
