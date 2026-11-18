import { Radio, SelectField, TextField } from "@/components";
import { Percent } from "lucide-react";
import type { useRestaurantSettings } from "../hooks/useRestaurantSettings";
export function ServiceFeeSettings({
  state,
  editable,
}: {
  state: ReturnType<typeof useRestaurantSettings>;
  editable: boolean;
}) {
  if (state.loading || !state.saved) return null;
  return (
    <section
      className="settings-card settings-fee-section"
      aria-labelledby="restaurant-settings-fee"
    >
      <div className="settings-card-heading">
        <span className="settings-section-icon">
          <Percent aria-hidden="true" />
        </span>
        <div>
          <h2 id="restaurant-settings-fee">Taxa de serviço</h2>
          <p>Defina o percentual sugerido no fechamento da conta.</p>
        </div>
      </div>
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
            form="restaurant-settings-form"
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
          form="restaurant-settings-form"
          label="Outro (%)"
          inputMode="decimal"
          value={state.form.serviceFeeRate}
          readOnly={!editable}
          disabled={state.busy}
          hint="De 0 a 20%, com até duas casas decimais."
          onChange={(event) =>
            state.setForm({ ...state.form, serviceFeeRate: event.target.value })
          }
        />
      )}
      <section
        className="settings-cutoff-section"
        aria-labelledby="restaurant-settings-day"
      >
        <h2 id="restaurant-settings-day">Numeração dos pedidos</h2>
        <SelectField
          id="settings-day-cutoff"
          form="restaurant-settings-form"
          label="Virada do dia"
          value={state.form.dayCutoffHour}
          disabled={!editable || state.busy}
          hint="Pedidos antes desse horário contam no dia de operação anterior. Altere fora do expediente para evitar mudanças na numeração."
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
      {!editable && (
        <p>Somente o administrador pode alterar as configurações.</p>
      )}
    </section>
  );
}
