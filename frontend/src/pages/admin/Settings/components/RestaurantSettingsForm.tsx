import {
  Button,
  Radio,
  SelectField,
  SkeletonCard,
  SystemMessage,
  TextField,
} from "@/components";
import type { useRestaurantSettings } from "../hooks/useRestaurantSettings";
type State = ReturnType<typeof useRestaurantSettings>;
export function RestaurantSettingsForm({
  state,
  editable,
}: {
  state: State;
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
    ["name", "Nome", 120],
    ["address", "Endereço", 255],
    ["openingHours", "Horário de funcionamento", 255],
    ["contact", "Contato", 120],
  ] as const;
  return (
    <form
      className="settings-card settings-restaurant-form"
      onSubmit={state.submit}
    >
      <section aria-labelledby="restaurant-settings-info">
        <h2 id="restaurant-settings-info">Informações do restaurante</h2>
        {fields.map(([key, label, maxLength]) => (
          <TextField
            key={key}
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
      </section>
      <section aria-labelledby="restaurant-settings-fee">
        <h2 id="restaurant-settings-fee">Taxa de serviço</h2>
        <fieldset
          className="settings-fee-choices"
          disabled={!editable || state.busy}
        >
          <legend>Percentual</legend>
          {[
            ["0", "Sem taxa"],
            ["5", "5%"],
            ["10", "10%"],
            ["other", "Outro"],
          ].map(([value, label]) => (
            <Radio
              key={value}
              name="service-fee-rate"
              label={label}
              checked={state.form.rateChoice === value}
              onChange={() =>
                state.setForm({
                  ...state.form,
                  rateChoice: value,
                  serviceFeeRate:
                    value === "other" ? state.form.serviceFeeRate : value,
                })
              }
            />
          ))}
        </fieldset>
        {state.form.rateChoice === "other" && (
          <TextField
            id="settings-service-fee-rate"
            label="Outro (%)"
            inputMode="decimal"
            value={state.form.serviceFeeRate}
            readOnly={!editable}
            disabled={state.busy}
            hint="De 0 a 20%, com até duas casas decimais."
            onChange={(event) =>
              state.setForm({
                ...state.form,
                serviceFeeRate: event.target.value,
              })
            }
          />
        )}
        {!editable && (
          <p>Somente o administrador pode alterar as configurações.</p>
        )}
      </section>
      <section aria-labelledby="restaurant-settings-day">
        <h2 id="restaurant-settings-day">Número do pedido</h2>
        <SelectField
          id="settings-day-cutoff"
          label="Virada do dia"
          value={state.form.dayCutoffHour}
          disabled={!editable || state.busy}
          hint="Os pedidos são numerados #1, #2… a cada dia de operação. Pedidos antes deste horário contam no dia anterior (ex.: com 05:00, um pedido às 03:40 entra no dia anterior). Mudar a virada no meio do expediente reinicia a contagem no novo dia."
          onChange={(event) =>
            state.setForm({ ...state.form, dayCutoffHour: event.target.value })
          }
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={String(hour)}>
              {String(hour).padStart(2, "0")}:00
            </option>
          ))}
        </SelectField>
      </section>
      {state.error && (
        <SystemMessage variant="error">{state.error}</SystemMessage>
      )}
      {state.notice && (
        <SystemMessage variant="success">{state.notice}</SystemMessage>
      )}
      {editable && (
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
            Salvar configurações
          </Button>
        </div>
      )}
    </form>
  );
}
