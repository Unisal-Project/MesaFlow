import { useEffect, useState, type ReactNode } from "react";
import { fetchPublicSettings, type PublicRestaurantSettings } from "@/services/settings.service";
import { RestaurantSettingsContext } from "./restaurant-settings";

export function RestaurantSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicRestaurantSettings | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchPublicSettings().then((data) => {
      if (!cancelled) setSettings(data);
    }).catch(() => { /* Mantém o nome padrão e o banner sem imagem. */ });
    return () => { cancelled = true; };
  }, []);
  return <RestaurantSettingsContext.Provider value={settings}>{children}</RestaurantSettingsContext.Provider>;
}
