import { useState } from "react";
import { ProfileForm } from "./components/ProfileForm";
import { AdminSidebar } from "@/components";
import { getSession } from "@/services/auth.service";
import { useRestaurantSettings } from "./hooks/useRestaurantSettings";
import { RestaurantSettingsForm } from "./components/RestaurantSettingsForm";
import { ServiceFeeSettings } from "./components/ServiceFeeSettings";
import "./styles.scss";

type SettingsProps = { onNavigate: (id: string) => void };

export default function Settings({ onNavigate }: SettingsProps) {
  const [, refreshProfile] = useState(0);
  const user = getSession()?.user;
  const editable = user?.role === "ADMIN";
  const settings = useRestaurantSettings(editable);
  return (
    <div className="settings-page">
      <AdminSidebar
        activeId="settings"
        brandSubtitle="GESTÃO DO RESTAURANTE"
        navigationLabel="MENU PRINCIPAL"
        showAvatar
        onChange={(id) => {
          if (settings.confirmDiscard()) onNavigate(id);
        }}
      />
      <main className="settings-content">
        <header className="settings-heading">
          <span>SEU ESTABELECIMENTO</span>
          <h1>Configurações</h1>
          <p>Cuide da apresentação do restaurante e dos dados da sua conta.</p>
        </header>
        <div className="settings-layout">
          <RestaurantSettingsForm state={settings} editable={editable} />
          <aside
            className="settings-side-column"
            aria-label="Conta e taxa de serviço"
          >
            <ProfileForm onSaved={() => refreshProfile((value) => value + 1)} />
            <ServiceFeeSettings state={settings} editable={editable} />
          </aside>
        </div>
      </main>
    </div>
  );
}
