import { useCallback, useEffect, useState, type FormEvent } from "react";
import { setDayCutoff } from "@/utils/businessDay";
import {
  fetchSettings,
  saveSettings,
  type RestaurantSettings,
} from "@/services/settings.service";
const emptyForm = {
  name: "",
  address: "",
  openingHours: "",
  contact: "",
  serviceFeeRate: "10",
  rateChoice: "10",
  dayCutoffHour: "5",
};
const toForm = (data: RestaurantSettings) => ({
  name: data.name ?? "",
  address: data.address ?? "",
  openingHours: data.openingHours ?? "",
  contact: data.contact ?? "",
  serviceFeeRate: String(data.serviceFeeRate),
  rateChoice: [0, 5, 10].includes(data.serviceFeeRate)
    ? String(data.serviceFeeRate)
    : "other",
  dayCutoffHour: String(data.dayCutoffHour ?? 5),
});
export function useRestaurantSettings(editable: boolean) {
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState<typeof emptyForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty =
    saved !== null && JSON.stringify(form) !== JSON.stringify(saved);
  const reload = useCallback(async () => {
    setError("");
    try {
      const data = toForm(await fetchSettings());
      setForm(data);
      setSaved(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as configurações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);
  useEffect(() => {
    if (!editable || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editable, dirty]);
  const confirmDiscard = () =>
    !editable || !dirty || window.confirm("Descartar alterações?");
  const discard = () => {
    if (saved && confirmDiscard()) {
      setForm(saved);
      setError("");
      setNotice("");
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editable || busy || !saved) return;
    setError("");
    setNotice("");
    const value = form.serviceFeeRate.trim().replace(",", ".");
    const rate = Number(value);
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(value) ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 20
    ) {
      setError("Informe uma taxa de 0 a 20%, com até duas casas decimais.");
      return;
    }
    setBusy(true);
    const text = (value: string) => value.trim() || null;
    try {
      const data = toForm(
        await saveSettings({
          name: text(form.name),
          address: text(form.address),
          openingHours: text(form.openingHours),
          contact: text(form.contact),
          serviceFeeRate: rate,
          dayCutoffHour: Number(form.dayCutoffHour),
        }),
      );
      setDayCutoff(Number(data.dayCutoffHour));
      setForm(data);
      setSaved(data);
      setNotice("Configurações salvas com sucesso.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as configurações.",
      );
    } finally {
      setBusy(false);
    }
  };
  return {
    form,
    setForm,
    saved,
    loading,
    busy,
    error,
    notice,
    dirty,
    reload,
    submit,
    confirmDiscard,
    discard,
  };
}
