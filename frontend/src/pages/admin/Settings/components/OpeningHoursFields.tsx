import { Clock3 } from "lucide-react";
import { Switch, TextField } from "@/components";
import {
  emptyOpeningHours,
  parseOpeningHours,
  serializeOpeningHours,
  type OpeningDay,
} from "@/utils/opening-hours";
export function OpeningHoursFields({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const parsed = parseOpeningHours(value);
  const days = parsed ?? emptyOpeningHours();
  const update = (id: string, changes: Partial<OpeningDay>) =>
    onChange(
      serializeOpeningHours(
        days.map((day) => (day.id === id ? { ...day, ...changes } : day)),
      ),
    );
  return (
    <section
      className="settings-opening-hours"
      aria-labelledby="settings-hours-title"
    >
      <div className="settings-card-heading">
        <span className="settings-section-icon">
          <Clock3 aria-hidden="true" />
        </span>
        <div>
          <h2 id="settings-hours-title">Dias e horários</h2>
          <p>Defina quando o restaurante abre.</p>
        </div>
      </div>
      {!parsed && (
        <p className="settings-hours-legacy">
          Horário atual: <strong>{value}</strong>. Configure os dias abaixo para
          atualizar.
        </p>
      )}
      <fieldset className="settings-hours-days" disabled={disabled}>
        <legend className="settings-hours-legend">
          Funcionamento por dia da semana
        </legend>
        {days.map((day, index) => (
          <div
            className={`settings-hours-day${day.open ? " is-open" : ""}`}
            key={day.id}
          >
            <div className="settings-hours-day-heading">
              <span className="settings-hours-day-name">{day.label}</span>
              <Switch
                label={day.open ? "Aberto" : "Fechado"}
                checked={day.open}
                aria-label={`Funcionamento de ${day.label.toLocaleLowerCase("pt-BR")}`}
                onChange={(event) =>
                  update(day.id, { open: event.target.checked })
                }
              />
            </div>
            {day.open && (
              <div className="settings-hours-times">
                <TextField
                  id={`settings-hours-from-${index}`}
                  label="Abertura"
                  type="time"
                  required
                  aria-label={`Abertura de ${day.label.toLocaleLowerCase("pt-BR")}`}
                  value={day.from}
                  onChange={(event) =>
                    update(day.id, { from: event.target.value })
                  }
                />
                <span className="settings-hours-until" aria-hidden="true">
                  até
                </span>
                <TextField
                  id={`settings-hours-to-${index}`}
                  label="Fechamento"
                  type="time"
                  required
                  aria-label={`Fechamento de ${day.label.toLocaleLowerCase("pt-BR")}`}
                  value={day.to}
                  onChange={(event) =>
                    update(day.id, { to: event.target.value })
                  }
                />
                {day.from && day.to && day.to < day.from && (
                  <span className="settings-hours-next-day">
                    Fecha no dia seguinte
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </fieldset>
      <p className="settings-hours-hint">
        Horários após meia-noite: por exemplo, 18:00 até 02:00.
      </p>
    </section>
  );
}
