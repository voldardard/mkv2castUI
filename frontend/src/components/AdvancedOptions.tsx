'use client';

import { useTranslations } from '@/lib/i18n';
import { ConversionOptionsType } from './ConversionOptions';

interface AdvancedOptionsProps {
  options: ConversionOptionsType;
  onChange: (options: ConversionOptionsType) => void;
  lang: string;
}

const PRESETS = [
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow',
];

export function AdvancedOptions({ options, onChange, lang }: AdvancedOptionsProps) {
  const t = useTranslations(lang);

  const handleChange = <K extends keyof ConversionOptionsType>(
    key: K,
    value: ConversionOptionsType[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="space-y-6 p-4 bg-surface-800/50 rounded-xl border border-surface-700">
      <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
        {t('advanced.title')}
      </h3>

      {/* CRF Slider */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-surface-300">
            CRF ({t('advanced.crf')})
          </label>
          <span className="text-sm text-primary-400 font-mono">{options.crf}</span>
        </div>
        <input
          type="range"
          min="0"
          max="51"
          value={options.crf}
          onChange={(e) => handleChange('crf', parseInt(e.target.value))}
          className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
        <div className="flex justify-between text-xs text-surface-500 mt-1">
          <span>{t('advanced.quality_best')}</span>
          <span>{t('advanced.quality_worst')}</span>
        </div>
      </div>

      {/* Preset */}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-2">
          {t('advanced.preset')}
        </label>
        <select
          value={options.preset}
          onChange={(e) => handleChange('preset', e.target.value)}
          className="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white focus:border-primary-500 focus:outline-none transition-colors"
        >
          {PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-surface-500">{t('advanced.preset_hint')}</p>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <ToggleOption
          checked={options.force_h264}
          onChange={(v) => handleChange('force_h264', v)}
          label={t('advanced.force_h264')}
          description={t('advanced.force_h264_desc')}
        />

        <ToggleOption
          checked={options.allow_hevc}
          onChange={(v) => handleChange('allow_hevc', v)}
          label={t('advanced.allow_hevc')}
          description={t('advanced.allow_hevc_desc')}
        />

        <ToggleOption
          checked={options.force_aac}
          onChange={(v) => handleChange('force_aac', v)}
          label={t('advanced.force_aac')}
          description={t('advanced.force_aac_desc')}
        />

        <ToggleOption
          checked={options.keep_surround}
          onChange={(v) => handleChange('keep_surround', v)}
          label={t('advanced.keep_surround')}
          description={t('advanced.keep_surround_desc')}
        />

        <ToggleOption
          checked={options.integrity_check}
          onChange={(v) => handleChange('integrity_check', v)}
          label={t('advanced.integrity_check')}
          description={t('advanced.integrity_check_desc')}
        />

        <ToggleOption
          checked={options.deep_check}
          onChange={(v) => handleChange('deep_check', v)}
          label={t('advanced.deep_check')}
          description={t('advanced.deep_check_desc')}
        />
      </div>
    </div>
  );
}

interface ToggleOptionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}

function ToggleOption({ checked, onChange, label, description }: ToggleOptionProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`
            w-10 h-6 rounded-full transition-colors duration-200
            ${checked ? 'bg-primary-500' : 'bg-surface-700'}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
              ${checked ? 'translate-x-5' : 'translate-x-1'}
            `}
          />
        </div>
      </div>
      <div className="flex-1">
        <span className="block text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
          {label}
        </span>
        <span className="block text-xs text-surface-500">{description}</span>
      </div>
    </label>
  );
}
