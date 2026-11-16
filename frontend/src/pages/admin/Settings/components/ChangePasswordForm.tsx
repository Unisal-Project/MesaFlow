import { useState } from "react";

import { Button, Switch, TextField } from "@/components";

import { useChangePassword } from "../hooks/useChangePassword";

export function ChangePasswordForm() {
  const { form, setForm, error, success, busy, submit } = useChangePassword();
  const [showPasswords, setShowPasswords] = useState(false);
  const type = showPasswords ? "text" : "password";
  const field = (name: keyof typeof form) => ({
    type,
    required: true,
    value: form[name],
    onChange: (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
    <section className="settings-card" aria-labelledby="settings-password-title">
      <h2 id="settings-password-title">Alterar senha</h2>
      <form className="settings-password-form" onSubmit={submit}>
        <TextField
          id="settings-current-password"
          label="Senha atual"
          autoComplete="current-password"
          {...field("currentPassword")}
        />
        <TextField
          id="settings-new-password"
          label="Nova senha"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          hint="Pelo menos 8 caracteres"
          {...field("newPassword")}
        />
        <TextField
          id="settings-confirm-password"
          label="Confirmar nova senha"
          autoComplete="new-password"
          {...field("confirmPassword")}
        />
        <Switch
          label="Mostrar senhas"
          checked={showPasswords}
          onChange={(event) => setShowPasswords(event.target.checked)}
        />
        {error && (
          <p className="settings-message settings-message--error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="settings-message" role="status">
            {success}
          </p>
        )}
        <Button type="submit" loading={busy}>
          Alterar senha
        </Button>
      </form>
    </section>
  );
}
