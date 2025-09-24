// Keskitetty käyttäjäasetusten hallinta localStorage:ssa

export interface UserSettings {
  // Näkyvyysasetukset
  hideHeatingPipes: boolean;
  hideLEDStrips: boolean;
  hideLamps: boolean;
  hideTemperatureIcons: boolean;
  hideWallLights: boolean;
  hideHeatPumps: boolean;
  
  // Voidaan lisätä tulevaisuudessa muita asetuksia:
  // theme: 'light' | 'dark';
  // language: 'fi' | 'en';
  // defaultView: string;
  // snapToGrid: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  hideHeatingPipes: false,
  hideLEDStrips: false,
  hideLamps: false,
  hideTemperatureIcons: false,
  hideWallLights: false,
  hideHeatPumps: false,
};

const STORAGE_KEY = 'kodinohjaus_userSettings';

// Lataa asetukset localStorage:sta
export function loadUserSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Varmistetaan että kaikki tarvittavat kentät on olemassa
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('Virhe ladattaessa käyttäjäasetuksia:', error);
  }
  return DEFAULT_SETTINGS;
}

// Tallenna asetukset localStorage:iin
export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Virhe tallennettaessa käyttäjäasetuksia:', error);
  }
}

// Päivitä yksittäinen asetus
export function updateUserSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): UserSettings {
  const currentSettings = loadUserSettings();
  const newSettings = { ...currentSettings, [key]: value };
  saveUserSettings(newSettings);
  return newSettings;
}

// Hook käyttäjäasetusten käyttöön React-komponenteissa
import { useState, useEffect } from 'react';

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(loadUserSettings);

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const newSettings = updateUserSetting(key, value);
    setSettings(newSettings);
  };

  // Kuuntele localStorage muutoksia muista välilehdistä
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          setSettings({ ...DEFAULT_SETTINGS, ...newSettings });
        } catch (error) {
          console.warn('Virhe päivitettäessä asetuksia storage eventistä:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { settings, updateSetting };
}
