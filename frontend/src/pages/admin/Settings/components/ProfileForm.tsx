import { useState, type FormEvent } from "react";
import { Button, TextField } from "@/components";
import { getSession, updateProfile } from "@/services/auth.service";

export function ProfileForm({onSaved}: {onSaved: () => void}) {
  const user = getSession()?.user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const emailChanged = email.trim().toLowerCase() !== user?.email;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await updateProfile({name: name.trim(), ...(emailChanged && {email: email.trim(), currentPassword: password})});
      setPassword(""); setNotice("Perfil atualizado."); onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o perfil."); }
    finally { setBusy(false); }
  }
  return <section className="settings-card"><h2>Sua conta</h2><form className="settings-password-form" onSubmit={submit}>
    <TextField label="Nome" value={name} required maxLength={120} autoComplete="name" onChange={event => setName(event.target.value)} />
    <TextField label="E-mail" type="email" value={email} required maxLength={180} autoComplete="email" onChange={event => setEmail(event.target.value)} />
    {emailChanged && <TextField label="Senha atual para alterar o e-mail" type="password" value={password} required autoComplete="current-password" onChange={event => setPassword(event.target.value)} />}
    {error && <p role="alert" className="settings-message--error">{error}</p>}
    {notice && <p role="status" className="settings-message">{notice}</p>}
    <Button type="submit" loading={busy}>Salvar perfil</Button>
  </form></section>;
}
