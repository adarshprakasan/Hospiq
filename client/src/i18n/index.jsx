import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { arSA, enUS } from '@mui/material/locale';
import { Button } from '@mui/material';
import theme from '../theme';
import arabic from './ar.json';
const Context = createContext(null);
let current = localStorage.getItem('language') === 'ar' ? 'ar' : 'en';
export const t = value => current === 'ar' && typeof value === 'string' ? arabic[value] || value : value;
export const useLocale = () => useContext(Context);
const ltr = createCache({ key: 'hospiq' });
const rtl = createCache({ key: 'hospiqrtl', stylisPlugins: [prefixer, rtlPlugin] });
export function LocaleProvider({ children }) {
  const [language, update] = useState(current);
  function setLanguage(next) { current = next; localStorage.setItem('language', next); update(next); }
  useLayoutEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; }, [language]);
  const localizedTheme = useMemo(() => createTheme(theme, { direction: language === 'ar' ? 'rtl' : 'ltr' }, language === 'ar' ? arSA : enUS), [language]);
  return <Context.Provider value={{ language, setLanguage }}><CacheProvider value={language === 'ar' ? rtl : ltr}><ThemeProvider theme={localizedTheme}>{children}</ThemeProvider></CacheProvider></Context.Provider>;
}
export function LanguageSwitcher() {
  const { language, setLanguage } = useLocale();
  return <Button aria-label="Change language" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>{language === 'en' ? 'العربية' : 'English'}</Button>;
}
