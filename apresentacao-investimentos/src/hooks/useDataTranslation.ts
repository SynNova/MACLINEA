import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { withBase } from '../utils/assetUrl';

type DataTranslationMap = Record<string, string>;

export function useDataTranslation(): {
  tData: (text: string) => string;
  hasMap: boolean;
} {
  const { locale } = useI18n();
  const [map, setMap] = useState<DataTranslationMap>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Só faz sentido carregar quando estiver em italiano
      if (locale !== 'it-IT') {
        setMap({});
        return;
      }

      try {
        const res = await fetch(withBase('dados/traducao_it.json'), { cache: 'no-store' });
        if (!res.ok) {
          // Arquivo opcional — se não existir, segue sem tradução de dados
          if (!cancelled) setMap({});
          return;
        }
        const json = (await res.json()) as DataTranslationMap;
        if (!cancelled && json && typeof json === 'object') {
          setMap(json);
        }
      } catch {
        if (!cancelled) setMap({});
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const tData = useMemo(() => {
    return (text: string) => {
      if (!text) return '';
      if (locale !== 'it-IT') return text;
      return map[text] ?? text;
    };
  }, [locale, map]);

  return { tData, hasMap: Object.keys(map).length > 0 };
}


