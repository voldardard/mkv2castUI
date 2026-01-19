'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Zap, Cpu, Gauge } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { AdvancedOptions } from './AdvancedOptions';

export interface ConversionOptionsType {
  container: string;
  hw_backend: string;
  preset: string;
  crf: number;
  audio_bitrate: string;
  // Hardware-specific quality settings
  vaapi_qp: number;
  qsv_quality: number;
  nvenc_cq: number;
  // Codec decisions
  force_h264: boolean;
  allow_hevc: boolean;
  force_aac: boolean;
  keep_surround: boolean;
  // Audio/Subtitle selection
  audio_lang: string;
  audio_track: number | null;
  subtitle_lang: string;
  subtitle_track: number | null;
  prefer_forced_subs: boolean;
  no_subtitles: boolean;
  // Optimization
  skip_when_ok: boolean;
  no_silence: boolean;
  // Integrity checks
  integrity_check: boolean;
  deep_check: boolean;
}

interface ConversionOptionsProps {
  options: ConversionOptionsType;
  onChange: (options: ConversionOptionsType) => void;
  lang: string;
}

const QUALITY_PRESETS = [
  { id: 'fast', preset: 'fast', crf: 23, icon: Zap },
  { id: 'balanced', preset: 'slow', crf: 20, icon: Gauge },
  { id: 'quality', preset: 'veryslow', crf: 18, icon: Cpu },
];

export function ConversionOptions({ options, onChange, lang }: ConversionOptionsProps) {
  const t = useTranslations(lang);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedQualityPreset, setSelectedQualityPreset] = useState('balanced');

  const handleChange = <K extends keyof ConversionOptionsType>(
    key: K,
    value: ConversionOptionsType[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  const handleQualityPresetChange = (presetId: string) => {
    const preset = QUALITY_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedQualityPreset(presetId);
      onChange({
        ...options,
        preset: preset.preset,
        crf: preset.crf,
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Settings className="w-5 h-5" />
        {t('options.title')}
      </h2>

      {/* Quality Presets */}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-3">
          {t('options.quality')}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {QUALITY_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedQualityPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleQualityPresetChange(preset.id)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-300
                  ${
                    isSelected
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-surface-700 hover:border-surface-600 bg-surface-800/50'
                  }
                `}
              >
                <Icon
                  className={`w-6 h-6 mx-auto mb-2 ${
                    isSelected ? 'text-primary-400' : 'text-surface-400'
                  }`}
                />
                <span
                  className={`block text-sm font-medium ${
                    isSelected ? 'text-white' : 'text-surface-300'
                  }`}
                >
                  {t(`options.quality_${preset.id}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Container Format */}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-3">
          {t('options.container')}
        </label>
        <div className="flex gap-3">
          {['mkv', 'mp4'].map((format) => (
            <button
              key={format}
              onClick={() => handleChange('container', format)}
              className={`
                flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-300 uppercase font-medium
                ${
                  options.container === format
                    ? 'border-primary-500 bg-primary-500/10 text-white'
                    : 'border-surface-700 hover:border-surface-600 text-surface-400'
                }
              `}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      {/* Hardware Backend */}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-3">
          {t('options.backend')}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { id: 'auto', label: 'Auto' },
            { id: 'nvenc', label: 'NVENC' },
            { id: 'vaapi', label: 'VAAPI' },
            { id: 'qsv', label: 'QSV' },
            { id: 'cpu', label: 'CPU' },
          ].map((backend) => (
            <button
              key={backend.id}
              onClick={() => handleChange('hw_backend', backend.id)}
              className={`
                py-3 px-4 rounded-xl border-2 transition-all duration-300 text-sm font-medium
                ${
                  options.hw_backend === backend.id
                    ? 'border-primary-500 bg-primary-500/10 text-white'
                    : 'border-surface-700 hover:border-surface-600 text-surface-400'
                }
              `}
            >
              {backend.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-surface-500">{t('options.backend_hint')}</p>
      </div>

      {/* Audio Bitrate */}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-3">
          {t('options.audio_bitrate')}
        </label>
        <select
          value={options.audio_bitrate}
          onChange={(e) => handleChange('audio_bitrate', e.target.value)}
          className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white focus:border-primary-500 focus:outline-none transition-colors"
        >
          <option value="128k">128 kbps</option>
          <option value="192k">192 kbps ({t('options.recommended')})</option>
          <option value="256k">256 kbps</option>
          <option value="320k">320 kbps</option>
        </select>
      </div>

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors"
      >
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {showAdvanced ? t('options.hide_advanced') : t('options.show_advanced')}
        </span>
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <AdvancedOptions options={options} onChange={onChange} lang={lang} />
      )}
    </div>
  );
}
