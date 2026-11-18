import { createContext, useContext } from "react";
import type { PublicRestaurantSettings } from "@/services/settings.service";

export const RestaurantSettingsContext = createContext<PublicRestaurantSettings | null>(null);
export const usePublicRestaurantSettings = () => useContext(RestaurantSettingsContext);
