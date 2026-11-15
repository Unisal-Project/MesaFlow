import { useState, type FormEvent } from "react";

import { changePassword } from "@/services/auth.service";

const emptyForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Troca a própria senha; o token atual continua válido (segue logado). */
export function useChangePassword() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");
    if (form.newPassword !== form.confirmPassword) {
      setError("A confirmação não confere com a nova senha.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setForm(emptyForm);
      setSuccess("Senha alterada com sucesso");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível alterar a senha",
      );
    } finally {
      setBusy(false);
    }
  };

  return { form, setForm, error, success, busy, submit };
}
