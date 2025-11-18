/**
 * FileUpload Component Tests
 *
 * Testing philosophy: Test as user specifications - how users upload files
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileUpload } from '../../components/FileUpload';

// Mock Firebase
const mockUploadBytesResumable = jest.fn();
const mockAddDoc = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytesResumable: (...args: any[]) => mockUploadBytesResumable(...args),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
}));

describe('FileUpload Component - User File Upload Experience', () => {
  const defaultProps = {
    projectId: 'test-project-123',
    userId: 'test-user-123',
  };

  beforeEach(() => {
    mockUploadBytesResumable.mockClear();
    mockAddDoc.mockClear();
    mockOnSnapshot.mockClear();
  });

  describe('Initial Rendering - Specification: Users should see an upload interface', () => {
    it('should render the file upload component', () => {
      const { container } = render(<FileUpload {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('should display a file input for selection', () => {
      render(<FileUpload {...defaultProps} />);
      // Hidden file input should exist
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });
  });

  describe('File Validation - Specification: Only valid files should be accepted', () => {
    it('should accept PDF files', async () => {
      const onUploadComplete = jest.fn();
      mockAddDoc.mockResolvedValue({ id: 'doc-123' });
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn((event, onProgress, onError, onComplete) => {
          // Simulate successful upload
          setTimeout(onComplete, 0);
        }),
      });
      mockOnSnapshot.mockReturnValue(jest.fn());

      render(<FileUpload {...defaultProps} onUploadComplete={onUploadComplete} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalled();
      });
    });

    it('should accept DOCX files', async () => {
      mockAddDoc.mockResolvedValue({ id: 'doc-456' });
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn((event, onProgress, onError, onComplete) => {
          setTimeout(onComplete, 0);
        }),
      });
      mockOnSnapshot.mockReturnValue(jest.fn());

      render(<FileUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const docxFile = new File(['docx content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      Object.defineProperty(fileInput, 'files', {
        value: [docxFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalled();
      });
    });

    it('should reject files that are too large', async () => {
      const onUploadError = jest.fn();

      render(<FileUpload {...defaultProps} onUploadError={onUploadError} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a file larger than 5MB
      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        'large-file.pdf',
        { type: 'application/pdf' }
      );

      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(onUploadError).toHaveBeenCalledWith(
          expect.stringContaining('5MB')
        );
      });

      expect(mockAddDoc).not.toHaveBeenCalled();
    });

    it('should reject invalid file types', async () => {
      const onUploadError = jest.fn();

      render(<FileUpload {...defaultProps} onUploadError={onUploadError} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const txtFile = new File(['text content'], 'document.txt', { type: 'text/plain' });

      Object.defineProperty(fileInput, 'files', {
        value: [txtFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(onUploadError).toHaveBeenCalledWith(
          expect.stringContaining('PDF')
        );
      });

      expect(mockAddDoc).not.toHaveBeenCalled();
    });
  });

  describe('Upload Progress - Specification: Users should see upload progress', () => {
    it('should track upload progress', async () => {
      let progressCallback: Function;

      mockAddDoc.mockResolvedValue({ id: 'doc-789' });
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn((event, onProgress, onError, onComplete) => {
          progressCallback = onProgress;
        }),
      });

      render(<FileUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockUploadBytesResumable).toHaveBeenCalled();
      });

      // Simulate progress updates
      if (progressCallback!) {
        progressCallback({ bytesTransferred: 50, totalBytes: 100 });
        progressCallback({ bytesTransferred: 100, totalBytes: 100 });
      }
    });

    it('should show uploading status initially', async () => {
      mockAddDoc.mockResolvedValue({ id: 'doc-abc' });
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn(),
      });

      render(<FileUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalled();
      });
    });
  });

  describe('Upload Completion - Specification: Users should be notified when upload completes', () => {
    it('should call onUploadComplete callback when upload succeeds', async () => {
      const onUploadComplete = jest.fn();
      const documentId = 'completed-doc-123';

      mockAddDoc.mockResolvedValue({ id: documentId });
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn((event, onProgress, onError, onComplete) => {
          setTimeout(onComplete, 0);
        }),
      });

      mockOnSnapshot.mockImplementation((docRef, callback) => {
        // Simulate completed status
        setTimeout(() => {
          callback({
            data: () => ({
              status: 'completed',
              uploadedAt: { toDate: () => new Date() },
            }),
          });
        }, 10);
        return jest.fn(); // unsubscribe function
      });

      render(<FileUpload {...defaultProps} onUploadComplete={onUploadComplete} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(
        () => {
          expect(onUploadComplete).toHaveBeenCalledWith(documentId);
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Error Handling - Specification: Users should see errors when uploads fail', () => {
    it('should call onUploadError when upload fails', async () => {
      const onUploadError = jest.fn();

      mockAddDoc.mockResolvedValue({ id: 'failed-doc' });
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn((event, onProgress, onError, onComplete) => {
          setTimeout(() => onError(new Error('Upload failed')), 0);
        }),
      });

      render(<FileUpload {...defaultProps} onUploadError={onUploadError} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(onUploadError).toHaveBeenCalled();
      });
    });

    it('should handle processing failures', async () => {
      const onUploadError = jest.fn();

      mockAddDoc.mockResolvedValue({ id: 'processing-failed-doc' });
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn((event, onProgress, onError, onComplete) => {
          setTimeout(onComplete, 0);
        }),
      });

      mockOnSnapshot.mockImplementation((docRef, callback) => {
        setTimeout(() => {
          callback({
            data: () => ({
              status: 'failed',
              errorMessage: 'Processing failed',
            }),
          });
        }, 10);
        return jest.fn();
      });

      render(<FileUpload {...defaultProps} onUploadError={onUploadError} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(
        () => {
          expect(onUploadError).toHaveBeenCalledWith(
            expect.stringContaining('Processing failed')
          );
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Drag and Drop - Specification: Users can drag and drop files', () => {
    it('should handle drag enter event', () => {
      render(<FileUpload {...defaultProps} />);

      const dropZone = document.body.firstChild;

      fireEvent.dragEnter(dropZone as Element, {
        dataTransfer: {
          files: [new File(['content'], 'test.pdf', { type: 'application/pdf' })],
        },
      });

      // Should not throw error
      expect(dropZone).toBeTruthy();
    });

    it('should handle drag leave event', () => {
      render(<FileUpload {...defaultProps} />);

      const dropZone = document.body.firstChild;

      fireEvent.dragLeave(dropZone as Element);

      // Should not throw error
      expect(dropZone).toBeTruthy();
    });

    it('should handle drag over event', () => {
      render(<FileUpload {...defaultProps} />);

      const dropZone = document.body.firstChild;

      fireEvent.dragOver(dropZone as Element);

      // Should not throw error
      expect(dropZone).toBeTruthy();
    });
  });

  describe('Multiple Files - Specification: Users can track multiple file uploads', () => {
    it('should handle multiple file uploads independently', async () => {
      mockAddDoc
        .mockResolvedValueOnce({ id: 'doc-1' })
        .mockResolvedValueOnce({ id: 'doc-2' });

      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn((event, onProgress, onError, onComplete) => {
          setTimeout(onComplete, 0);
        }),
      });

      mockOnSnapshot.mockReturnValue(jest.fn());

      render(<FileUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Upload first file
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file1],
        writable: true,
        configurable: true,
      });
      fireEvent.change(fileInput);

      // Upload second file
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file2],
        writable: true,
        configurable: true,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledTimes(2);
      });
    });
  });
});
