import { useState } from "react";
import { ProfileForm } from "./components/ProfileForm";
import { AdminSidebar } from "@/components";
import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";
import { getSession } from "@/services/auth.service";
import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { useRestaurantSettings } from "./hooks/useRestaurantSettings";
import { RestaurantSettingsForm } from "./components/RestaurantSettingsForm";
import "./styles.scss";

type SettingsProps = { onNavigate: (id: string) => void };

export default function Settings({ onNavigate }: SettingsProps) {
  const [, refreshProfile] = useState(0);
  const user = getSession()?.user;
  const editable = user?.role === "ADMIN";
  const settings = useRestaurantSettings(editable);
  return (
    <div className="settings-page">
      <AdminSidebar activeId="settings" brandSubtitle="GESTÃO DO RESTAURANTE" navigationLabel="MENU PRINCIPAL" showAvatar
        brandImage={<img src={logoAlternativo} alt="" />} onChange={id => { if (settings.confirmDiscard()) onNavigate(id); }} />
      <main className="settings-content">
        <h1>Configurações</h1>
        <ProfileForm onSaved={() => refreshProfile(value => value + 1)} />
        <ChangePasswordForm />
        <RestaurantSettingsForm state={settings} editable={editable} />
      </main>
    </div>
  );
}
