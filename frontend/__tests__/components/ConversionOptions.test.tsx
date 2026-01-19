import { render, screen, fireEvent } from '@testing-library/react';
import { ConversionOptions, ConversionOptionsType } from '@/components/ConversionOptions';

describe('ConversionOptions', () => {
  const mockOnChange = jest.fn();
  const defaultOptions: ConversionOptionsType = {
    container: 'mp4',
    hw_backend: 'auto',
    crf: 23,
    preset: 'medium',
    audio_bitrate: '192k',
    force_h264: false,
    allow_hevc: false,
    force_aac: false,
    keep_surround: false,
    integrity_check: true,
    deep_check: false,
  };

  const defaultProps = {
    lang: 'en',
    options: defaultOptions,
    onChange: mockOnChange,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders the options title', () => {
    render(<ConversionOptions {...defaultProps} />);
    
    // Should display options title
    expect(screen.getByText(/Conversion Options/i)).toBeInTheDocument();
  });

  it('renders container format buttons', () => {
    render(<ConversionOptions {...defaultProps} />);
    
    // Should have MKV and MP4 buttons
    expect(screen.getByRole('button', { name: /mkv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mp4/i })).toBeInTheDocument();
  });

  it('renders hardware backend options', () => {
    render(<ConversionOptions {...defaultProps} />);
    
    // Should have hardware backend buttons
    expect(screen.getByRole('button', { name: /auto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vaapi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /qsv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cpu/i })).toBeInTheDocument();
  });

  it('renders quality presets', () => {
    render(<ConversionOptions {...defaultProps} />);
    
    // Should have quality preset buttons
    expect(screen.getByRole('button', { name: /fast/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /balanced/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quality/i })).toBeInTheDocument();
  });

  it('calls onChange when container changes', () => {
    render(<ConversionOptions {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /mkv/i }));
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ container: 'mkv' })
    );
  });

  it('calls onChange when hardware backend changes', () => {
    render(<ConversionOptions {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /cpu/i }));
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ hw_backend: 'cpu' })
    );
  });

  it('has audio bitrate selector', () => {
    render(<ConversionOptions {...defaultProps} />);
    
    // Should have audio bitrate select
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('toggles advanced options', () => {
    render(<ConversionOptions {...defaultProps} />);
    
    // Click to show advanced options
    const toggleButton = screen.getByText(/Show Advanced/i);
    fireEvent.click(toggleButton);
    
    // Advanced options should appear
    expect(screen.getByText(/Hide Advanced/i)).toBeInTheDocument();
  });
});
