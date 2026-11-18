import { useEffect, useState, type FormEvent } from "react";
import { Button, TextField } from "@/components";
import { Camera, UserRound } from "lucide-react";
import {
  getSession,
  updateProfile,
  uploadProfileAvatar,
} from "@/services/auth.service";
import { assetUrl } from "@/api/client";
import mesaFlowLogo from "@/assets/logotipo/logo_principal.png";

export function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const user = getSession()?.user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );
  const selectAvatar = (file?: File) => {
    if (!file || busy) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Escolha uma imagem JPG, PNG, WebP ou AVIF de até 5 MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
    setNotice("");
  };
  const emailChanged = email.trim().toLowerCase() !== user?.email;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateProfile({
        name: name.trim(),
        ...(emailChanged && { email: email.trim(), currentPassword: password }),
      });
      if (avatarFile) {
        await uploadProfileAvatar(avatarFile);
        setAvatarFile(null);
        setAvatarPreview("");
      }
      setPassword("");
      setNotice("Perfil atualizado.");
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o perfil.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card settings-profile-card">
      <header className="settings-card-heading">
        <span className="settings-section-icon">
          <UserRound aria-hidden="true" />
        </span>
        <div>
          <h2>Sua conta</h2>
          <p>Seus dados de acesso ao painel.</p>
        </div>
      </header>
      <form className="settings-password-form" onSubmit={submit}>
        <div className="settings-profile-photo">
          <img
            className="settings-profile-photo-preview"
            src={avatarPreview || assetUrl(user?.avatarUrl) || mesaFlowLogo}
            alt="Foto do perfil"
            onError={(event) => {
              if (event.currentTarget.getAttribute("src") !== mesaFlowLogo)
                event.currentTarget.src = mesaFlowLogo;
            }}
          />
          <div className="settings-profile-photo-controls">
            <label
              className={`settings-image-picker${busy ? " is-disabled" : ""}`}
            >
              <Camera aria-hidden="true" />
              <span>
                {user?.avatarUrl || avatarPreview
                  ? "Trocar foto"
                  : "Adicionar foto"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy}
                aria-label="Escolher foto do perfil"
                aria-describedby="settings-profile-photo-hint"
                onChange={(event) => {
                  selectAvatar(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <p id="settings-profile-photo-hint">
              Até 5 MB · Salva ao atualizar o perfil.
            </p>
          </div>
        </div>
        <TextField
          label="Nome"
          disabled={busy}
          value={name}
          required
          maxLength={120}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="E-mail"
          disabled={busy}
          type="email"
          value={email}
          required
          maxLength={180}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
        {emailChanged && (
          <TextField
            label="Senha atual para alterar o e-mail"
            disabled={busy}
            type="password"
            value={password}
            required
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
        {error && (
          <p role="alert" className="settings-message--error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="settings-message">
            {notice}
          </p>
        )}
        <Button type="submit" loading={busy}>
          Salvar perfil
        </Button>
      </form>
    </section>
  );
}
