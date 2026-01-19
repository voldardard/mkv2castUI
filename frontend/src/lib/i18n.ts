/**
 * Internationalization utilities for mkv2castUI.
 * 
 * Supports: en, fr, de, es, it
 */

type TranslationKey = string;
type Translations = Record<string, string | Record<string, string>>;

const translations: Record<string, Translations> = {
  en: {
    // Hero
    'hero.title': 'Convert Videos for Chromecast',
    'hero.subtitle': 'Upload your MKV files and convert them to Chromecast-compatible formats with hardware acceleration.',

    // Navigation
    'nav.convert': 'Convert',
    'nav.history': 'History',
    'nav.docs': 'Documentation',
    'nav.settings': 'Settings',
    'nav.login': 'Sign In',
    'nav.logout': 'Sign Out',

    // Upload
    'upload.title': 'Upload Files',
    'upload.drag_drop': 'Drag and drop your MKV files here',
    'upload.or': 'or',
    'upload.browse': 'browse to upload',
    'upload.drop_here': 'Drop files here...',
    'upload.drop_reject': 'Only MKV files are supported',
    'upload.max_size': 'Max file size: {size}',
    'upload.error.too_large': 'File is too large',
    'upload.error.invalid_type': 'Only MKV files are supported',

    // Files
    'files.selected': 'Selected Files',
    'files.file': 'file',
    'files.files': 'files',

    // Options
    'options.title': 'Conversion Options',
    'options.quality': 'Quality Preset',
    'options.quality_fast': 'Fast',
    'options.quality_balanced': 'Balanced',
    'options.quality_quality': 'Quality',
    'options.container': 'Output Format',
    'options.backend': 'Hardware Acceleration',
    'options.backend_hint': 'Auto will select the best available option',
    'options.audio_bitrate': 'Audio Bitrate',
    'options.recommended': 'recommended',
    'options.show_advanced': 'Show Advanced Options',
    'options.hide_advanced': 'Hide Advanced Options',

    // Advanced Options
    'advanced.title': 'Advanced Options',
    'advanced.crf': 'Quality - lower is better',
    'advanced.quality_best': 'Best',
    'advanced.quality_worst': 'Worst',
    'advanced.preset': 'Encoding Preset',
    'advanced.preset_hint': 'Slower presets produce better quality',
    'advanced.force_h264': 'Force H.264',
    'advanced.force_h264_desc': 'Always transcode video to H.264',
    'advanced.allow_hevc': 'Allow HEVC',
    'advanced.allow_hevc_desc': 'Keep HEVC if compatible with target device',
    'advanced.force_aac': 'Force AAC',
    'advanced.force_aac_desc': 'Always transcode audio to AAC',
    'advanced.keep_surround': 'Keep Surround',
    'advanced.keep_surround_desc': 'Preserve surround sound channels',
    'advanced.integrity_check': 'Integrity Check',
    'advanced.integrity_check_desc': 'Verify source file before conversion',
    'advanced.deep_check': 'Deep Check',
    'advanced.deep_check_desc': 'Full decode verification (slower)',

    // Convert
    'convert.start': 'Start Conversion',

    // Progress
    'progress.title': 'Conversion Progress',
    'progress.no_jobs': 'No active conversions',
    'progress.download': 'Download',

    // Status
    'status.pending': 'Pending',
    'status.queued': 'Queued',
    'status.analyzing': 'Analyzing',
    'status.processing': 'Processing',
    'status.completed': 'Completed',
    'status.failed': 'Failed',
    'status.cancelled': 'Cancelled',

    // Download
    'download.title': 'Ready for Download',
    'download.download': 'Download',
    'download.download_all': 'Download All',
    'download.copy_link': 'Copy Link',
    'download.open_new_tab': 'Open in New Tab',

    // Login
    'login.title': 'Sign in to continue',
    'login.subtitle': 'Create an account to start converting your videos',
    'login.google': 'Continue with Google',
    'login.github': 'Continue with GitHub',
    'login.terms': 'By signing in, you agree to our Terms of Service and Privacy Policy',

    // Footer
    'footer.powered_by': 'Powered by',
  },

  fr: {
    // Hero
    'hero.title': 'Convertissez vos vidéos pour Chromecast',
    'hero.subtitle': 'Téléchargez vos fichiers MKV et convertissez-les en formats compatibles Chromecast avec accélération matérielle.',

    // Navigation
    'nav.convert': 'Convertir',
    'nav.history': 'Historique',
    'nav.docs': 'Documentation',
    'nav.settings': 'Paramètres',
    'nav.login': 'Connexion',
    'nav.logout': 'Déconnexion',

    // Upload
    'upload.title': 'Télécharger des fichiers',
    'upload.drag_drop': 'Glissez-déposez vos fichiers MKV ici',
    'upload.or': 'ou',
    'upload.browse': 'parcourir pour télécharger',
    'upload.drop_here': 'Déposez les fichiers ici...',
    'upload.drop_reject': 'Seuls les fichiers MKV sont acceptés',
    'upload.max_size': 'Taille max: {size}',
    'upload.error.too_large': 'Fichier trop volumineux',
    'upload.error.invalid_type': 'Seuls les fichiers MKV sont acceptés',

    // Files
    'files.selected': 'Fichiers sélectionnés',
    'files.file': 'fichier',
    'files.files': 'fichiers',

    // Options
    'options.title': 'Options de conversion',
    'options.quality': 'Préréglage de qualité',
    'options.quality_fast': 'Rapide',
    'options.quality_balanced': 'Équilibré',
    'options.quality_quality': 'Qualité',
    'options.container': 'Format de sortie',
    'options.backend': 'Accélération matérielle',
    'options.backend_hint': 'Auto sélectionnera la meilleure option disponible',
    'options.audio_bitrate': 'Débit audio',
    'options.recommended': 'recommandé',
    'options.show_advanced': 'Afficher les options avancées',
    'options.hide_advanced': 'Masquer les options avancées',

    // Advanced Options
    'advanced.title': 'Options avancées',
    'advanced.crf': 'Qualité - plus bas est meilleur',
    'advanced.quality_best': 'Meilleur',
    'advanced.quality_worst': 'Pire',
    'advanced.preset': 'Préréglage d\'encodage',
    'advanced.preset_hint': 'Les préréglages plus lents produisent une meilleure qualité',
    'advanced.force_h264': 'Forcer H.264',
    'advanced.force_h264_desc': 'Toujours transcoder la vidéo en H.264',
    'advanced.allow_hevc': 'Autoriser HEVC',
    'advanced.allow_hevc_desc': 'Conserver HEVC si compatible avec l\'appareil cible',
    'advanced.force_aac': 'Forcer AAC',
    'advanced.force_aac_desc': 'Toujours transcoder l\'audio en AAC',
    'advanced.keep_surround': 'Garder le surround',
    'advanced.keep_surround_desc': 'Préserver les canaux audio surround',
    'advanced.integrity_check': 'Vérification d\'intégrité',
    'advanced.integrity_check_desc': 'Vérifier le fichier source avant conversion',
    'advanced.deep_check': 'Vérification approfondie',
    'advanced.deep_check_desc': 'Décodage complet de vérification (plus lent)',

    // Convert
    'convert.start': 'Démarrer la conversion',

    // Progress
    'progress.title': 'Progression de la conversion',
    'progress.no_jobs': 'Aucune conversion en cours',
    'progress.download': 'Télécharger',

    // Status
    'status.pending': 'En attente',
    'status.queued': 'En file d\'attente',
    'status.analyzing': 'Analyse en cours',
    'status.processing': 'En cours',
    'status.completed': 'Terminé',
    'status.failed': 'Échec',
    'status.cancelled': 'Annulé',

    // Download
    'download.title': 'Prêt à télécharger',
    'download.download': 'Télécharger',
    'download.download_all': 'Tout télécharger',
    'download.copy_link': 'Copier le lien',
    'download.open_new_tab': 'Ouvrir dans un nouvel onglet',

    // Login
    'login.title': 'Connectez-vous pour continuer',
    'login.subtitle': 'Créez un compte pour commencer à convertir vos vidéos',
    'login.google': 'Continuer avec Google',
    'login.github': 'Continuer avec GitHub',
    'login.terms': 'En vous connectant, vous acceptez nos Conditions d\'utilisation et notre Politique de confidentialité',

    // Footer
    'footer.powered_by': 'Propulsé par',
  },

  de: {
    'hero.title': 'Videos für Chromecast konvertieren',
    'hero.subtitle': 'Laden Sie Ihre MKV-Dateien hoch und konvertieren Sie sie mit Hardwarebeschleunigung in Chromecast-kompatible Formate.',
    'nav.convert': 'Konvertieren',
    'nav.history': 'Verlauf',
    'nav.docs': 'Dokumentation',
    'nav.settings': 'Einstellungen',
    'nav.login': 'Anmelden',
    'nav.logout': 'Abmelden',
    'upload.title': 'Dateien hochladen',
    'upload.drag_drop': 'MKV-Dateien hier ablegen',
    'upload.or': 'oder',
    'upload.browse': 'durchsuchen',
    'upload.drop_here': 'Dateien hier ablegen...',
    'upload.drop_reject': 'Nur MKV-Dateien werden unterstützt',
    'upload.max_size': 'Max. Dateigröße: {size}',
    'options.title': 'Konvertierungsoptionen',
    'options.quality': 'Qualitätsvoreinstellung',
    'options.quality_fast': 'Schnell',
    'options.quality_balanced': 'Ausgewogen',
    'options.quality_quality': 'Qualität',
    'convert.start': 'Konvertierung starten',
    'progress.title': 'Konvertierungsfortschritt',
    'progress.no_jobs': 'Keine aktiven Konvertierungen',
    'progress.download': 'Herunterladen',
    'login.title': 'Anmelden um fortzufahren',
    'login.google': 'Mit Google fortfahren',
    'login.github': 'Mit GitHub fortfahren',
    'footer.powered_by': 'Powered by',
  },

  es: {
    'hero.title': 'Convierte videos para Chromecast',
    'hero.subtitle': 'Sube tus archivos MKV y conviértelos a formatos compatibles con Chromecast con aceleración de hardware.',
    'nav.convert': 'Convertir',
    'nav.history': 'Historial',
    'nav.docs': 'Documentación',
    'nav.settings': 'Configuración',
    'nav.login': 'Iniciar sesión',
    'nav.logout': 'Cerrar sesión',
    'upload.title': 'Subir archivos',
    'upload.drag_drop': 'Arrastra y suelta tus archivos MKV aquí',
    'upload.or': 'o',
    'upload.browse': 'buscar para subir',
    'upload.drop_here': 'Suelta los archivos aquí...',
    'upload.drop_reject': 'Solo se admiten archivos MKV',
    'upload.max_size': 'Tamaño máximo: {size}',
    'options.title': 'Opciones de conversión',
    'options.quality': 'Preajuste de calidad',
    'options.quality_fast': 'Rápido',
    'options.quality_balanced': 'Equilibrado',
    'options.quality_quality': 'Calidad',
    'convert.start': 'Iniciar conversión',
    'progress.title': 'Progreso de conversión',
    'progress.no_jobs': 'Sin conversiones activas',
    'progress.download': 'Descargar',
    'login.title': 'Inicia sesión para continuar',
    'login.google': 'Continuar con Google',
    'login.github': 'Continuar con GitHub',
    'footer.powered_by': 'Desarrollado por',
  },

  it: {
    'hero.title': 'Converti video per Chromecast',
    'hero.subtitle': 'Carica i tuoi file MKV e convertili in formati compatibili con Chromecast con accelerazione hardware.',
    'nav.convert': 'Converti',
    'nav.history': 'Cronologia',
    'nav.docs': 'Documentazione',
    'nav.settings': 'Impostazioni',
    'nav.login': 'Accedi',
    'nav.logout': 'Esci',
    'upload.title': 'Carica file',
    'upload.drag_drop': 'Trascina e rilascia i tuoi file MKV qui',
    'upload.or': 'o',
    'upload.browse': 'sfoglia per caricare',
    'upload.drop_here': 'Rilascia i file qui...',
    'upload.drop_reject': 'Sono supportati solo file MKV',
    'upload.max_size': 'Dimensione massima: {size}',
    'options.title': 'Opzioni di conversione',
    'options.quality': 'Preimpostazione qualità',
    'options.quality_fast': 'Veloce',
    'options.quality_balanced': 'Bilanciato',
    'options.quality_quality': 'Qualità',
    'convert.start': 'Avvia conversione',
    'progress.title': 'Progresso conversione',
    'progress.no_jobs': 'Nessuna conversione attiva',
    'progress.download': 'Scarica',
    'login.title': 'Accedi per continuare',
    'login.google': 'Continua con Google',
    'login.github': 'Continua con GitHub',
    'footer.powered_by': 'Sviluppato da',
  },
};

export function useTranslations(lang: string) {
  const langTranslations = translations[lang] || translations.en;

  return function t(key: TranslationKey, params?: Record<string, string>): string {
    let text = (langTranslations[key] as string) || (translations.en[key] as string) || key;

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, value);
      });
    }

    return text;
  };
}

export function getLanguageFromPath(path: string): string {
  const match = path.match(/^\/([a-z]{2})\//);
  if (match && ['en', 'fr', 'de', 'es', 'it'].includes(match[1])) {
    return match[1];
  }
  return 'en';
}

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];
