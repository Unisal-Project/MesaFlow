import { Button, SkeletonCard, SystemMessage, TextField } from "@/components";
import { ImagePlus, Store, Save } from "lucide-react";
import { assetUrl } from "@/api/client";
import type { useRestaurantSettings } from "../hooks/useRestaurantSettings";
import { OpeningHoursFields } from "./OpeningHoursFields";
export function RestaurantSettingsForm({
  state,
  editable,
}: {
  state: ReturnType<typeof useRestaurantSettings>;
  editable: boolean;
}) {
  if (state.loading) return <SkeletonCard />;
  if (!state.saved)
    return (
      <section className="settings-card">
        <SystemMessage variant="error">{state.error}</SystemMessage>
        <Button variant="secondary" onClick={() => void state.reload()}>
          Tentar de novo
        </Button>
      </section>
    );
  const fields = [
    ["name", "Nome do restaurante", 120],
    ["address", "Endereço", 255],
    ["contact", "Contato", 120],
  ] as const;
  return (
    <form
      id="restaurant-settings-form"
      className="settings-restaurant-form"
      onSubmit={state.submit}
    >
      <div className="settings-card settings-restaurant-details">
        <header className="settings-card-heading">
          <span className="settings-section-icon">
            <Store aria-hidden="true" />
          </span>
          <div>
            <h2 id="restaurant-settings-info">Informações do restaurante</h2>
            <p>A identidade que seus clientes encontram no cardápio.</p>
          </div>
        </header>
        <section
          className="settings-restaurant-identity"
          aria-labelledby="restaurant-settings-info"
        >
          <div className="settings-restaurant-banner">
            <span className="settings-field-caption">
              Imagem de boas-vindas
            </span>
            <div className="settings-banner-preview">
              {(state.bannerPreview || state.form.bannerImageUrl) && (
                <img
                  src={
                    state.bannerPreview ||
                    assetUrl(state.form.bannerImageUrl) ||
                    undefined
                  }
                  alt="Prévia da imagem de boas-vindas"
                />
              )}
              <span className="settings-banner-name">
                {state.form.name.trim() || "MesaFlow"}
              </span>
            </div>
            <div className="settings-banner-upload">
              {editable && (
                <label
                  className={`settings-image-picker${state.busy ? " is-disabled" : ""}`}
                >
                  <ImagePlus aria-hidden="true" />
                  <span>
                    {state.bannerPreview || state.form.bannerImageUrl
                      ? "Trocar imagem"
                      : "Escolher imagem"}
                  </span>
                  <input
                    id="settings-banner-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={state.busy}
                    aria-describedby="settings-banner-hint"
                    onChange={(event) => {
                      state.selectBanner(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
              <p id="settings-banner-hint">JPG, PNG, WebP ou AVIF · Até 5 MB</p>
            </div>
          </div>
          <div className="settings-restaurant-fields">
            {fields.map(([key, label, maxLength]) => (
              <TextField
                key={key}
                className={`settings-field-${key}`}
                id={`settings-${key}`}
                label={label}
                maxLength={maxLength}
                value={state.form[key]}
                readOnly={!editable}
                disabled={state.busy}
                onChange={(event) =>
                  state.setForm({ ...state.form, [key]: event.target.value })
                }
              />
            ))}
          </div>
        </section>
      </div>
      <div className="settings-card settings-hours-card">
        <OpeningHoursFields
          value={state.form.openingHours}
          disabled={!editable || state.busy}
          onChange={(openingHours) =>
            state.setForm({ ...state.form, openingHours })
          }
        />
      </div>
      {state.error && (
        <SystemMessage variant="error">{state.error}</SystemMessage>
      )}
      {state.notice && (
        <SystemMessage variant="success">{state.notice}</SystemMessage>
      )}
      {editable && (
        <footer className="settings-restaurant-footer">
          <span
            className={`settings-save-status${state.dirty ? " is-pending" : ""}`}
          >
            {state.dirty ? "Alterações não salvas" : "Tudo atualizado"}
          </span>
          <div className="settings-restaurant-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={state.busy || !state.dirty}
              onClick={state.discard}
            >
              Descartar alterações
            </Button>
            <Button type="submit" loading={state.busy} disabled={!state.dirty}>
              <Save aria-hidden="true" />
              Salvar configurações
            </Button>
          </div>
        </footer>
      )}
    </form>
  );
}
