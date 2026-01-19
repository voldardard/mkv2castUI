'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Palette,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
  Image,
  Type,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

interface BrandingSettings {
  site_name: string;
  site_tagline: string;
  logo: string | null;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
}

const presetColors = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1',
];

function ColorPicker({ color, onChange, label }: { color: string; onChange: (color: string) => void; label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(color);

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomColor(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-surface-300 mb-2">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-lg hover:border-surface-600 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg border-2 border-white/20"
          style={{ backgroundColor: color }}
        />
        <span className="text-white font-mono">{color}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 p-4 bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-20 w-64">
            <div className="grid grid-cols-6 gap-2 mb-4">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => {
                    onChange(presetColor);
                    setCustomColor(presetColor);
                    setIsOpen(false);
                  }}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    color === presetColor ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customColor}
                onChange={handleCustomChange}
                placeholder="#000000"
                maxLength={7}
                className="flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white font-mono text-sm focus:border-primary-500 focus:outline-none"
              />
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  onChange(e.target.value);
                  setCustomColor(e.target.value);
                }}
                className="w-10 h-10 rounded-lg cursor-pointer bg-surface-700 border border-surface-600"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminBrandingPage() {
  const params = useParams();
  const lang = params.lang as string || 'en';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/api/admin/branding/');
        setSettings(response.data);
        if (response.data.logo) {
          setLogoPreview(response.data.logo);
        }
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 403) {
          setError('Access denied. You do not have admin privileges.');
        } else if (status === 401) {
          setError('Authentication required. Please log in again.');
        } else {
          setError(err.response?.data?.detail || 'Failed to load branding settings');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('site_name', settings.site_name);
      formData.append('site_tagline', settings.site_tagline);
      formData.append('primary_color', settings.primary_color);
      formData.append('secondary_color', settings.secondary_color);
      
      if (settings.logo_url) {
        formData.append('logo_url', settings.logo_url);
      }
      
      if (logoFile) {
        formData.append('logo_file', logoFile);
      }

      await api.put('/api/admin/branding/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess('Branding saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Access denied. You do not have admin privileges.');
      } else if (status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to save branding');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (settings) {
      setSettings({ ...settings, logo_url: '' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <p className="text-red-400">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Branding</h1>
          <p className="text-surface-400 mt-1">Customize the look and feel of your application</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Image className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Logo</h2>
          </div>

          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-surface-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
            >
              {logoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-32 mx-auto"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLogo();
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-surface-500 mb-4" />
                  <p className="text-surface-400">
                    Click or drag to upload logo
                  </p>
                  <p className="text-surface-500 text-sm mt-1">
                    PNG, JPG, SVG up to 2MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Or use URL
              </label>
              <input
                type="url"
                value={settings.logo_url}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Site Name & Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Type className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Site Identity</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                placeholder="mkv2cast"
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Tagline
              </label>
              <input
                type="text"
                value={settings.site_tagline}
                onChange={(e) => setSettings({ ...settings, site_tagline: e.target.value })}
                placeholder="Convert videos for Chromecast"
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Colors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent-500/10">
              <Palette className="w-5 h-5 text-accent-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Colors</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorPicker
              label="Primary Color"
              color={settings.primary_color}
              onChange={(color) => setSettings({ ...settings, primary_color: color })}
            />
            <ColorPicker
              label="Secondary Color"
              color={settings.secondary_color}
              onChange={(color) => setSettings({ ...settings, secondary_color: color })}
            />
          </div>

          {/* Preview */}
          <div className="mt-8 p-6 bg-surface-800/50 rounded-xl">
            <h3 className="text-surface-400 text-sm font-medium mb-4">Preview</h3>
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})` }}
              >
                {settings.site_name[0]?.toUpperCase() || 'M'}
              </div>
              <div>
                <h4 className="text-white font-bold text-lg">{settings.site_name}</h4>
                <p className="text-surface-400 text-sm">{settings.site_tagline}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})` }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: `${settings.primary_color}20`, color: settings.primary_color }}
              >
                Secondary Button
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
