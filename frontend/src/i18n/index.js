import { createI18n } from 'vue-i18n';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';

// Detectar idioma del navegador y hacer fallback a 'es'
const detectLocale = () => {
  const saved = localStorage.getItem('stc_locale');
  if (saved && ['es', 'pt-BR'].includes(saved)) return saved;

  const nav = navigator.language || navigator.userLanguage || 'es';
  if (nav.startsWith('pt')) return 'pt-BR';
  return 'es';
};

const i18n = createI18n({
  legacy: false,          // Composition API mode
  locale: detectLocale(),
  fallbackLocale: 'es',
  messages: {
    es,
    'pt-BR': ptBR,
  },
});

export default i18n;
