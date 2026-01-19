import { render, screen } from '@testing-library/react';
import { FileUploader } from '@/components/FileUploader';

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop, accept, maxSize }: any) => ({
    getRootProps: () => ({
      'data-testid': 'dropzone',
      onClick: jest.fn(),
    }),
    getInputProps: () => ({
      'data-testid': 'file-input',
    }),
    isDragActive: false,
    isDragReject: false,
    acceptedFiles: [],
    // Expose onDrop for testing
    _onDrop: onDrop,
  }),
}));

describe('FileUploader', () => {
  const mockOnFilesSelected = jest.fn();
  const defaultProps = {
    lang: 'en',
    onFilesSelected: mockOnFilesSelected,
  };

  beforeEach(() => {
    mockOnFilesSelected.mockClear();
  });

  it('renders the dropzone', () => {
    render(<FileUploader {...defaultProps} />);
    
    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toBeInTheDocument();
  });

  it('renders file input', () => {
    render(<FileUploader {...defaultProps} />);
    
    const input = screen.getByTestId('file-input');
    expect(input).toBeInTheDocument();
  });

  it('displays upload instructions', () => {
    render(<FileUploader {...defaultProps} />);
    
    // Should show drag and drop text
    expect(screen.getByText(/Drag and drop/i)).toBeInTheDocument();
  });

  it('shows max file size', () => {
    render(<FileUploader {...defaultProps} maxSize={10 * 1024 * 1024 * 1024} />);
    
    // Should show max size indicator
    expect(screen.getByText(/Max file size/i)).toBeInTheDocument();
  });

  it('accepts MKV files indication', () => {
    render(<FileUploader {...defaultProps} />);
    
    // Should indicate MKV support
    expect(screen.getByText('MKV')).toBeInTheDocument();
  });
});
