import { useState } from "react";
import { SelectField, Switch, TextField } from "@/components";
import { emptyPromoForm, type PromoForm } from "@/utils/promotion";
import { MONEY_PATTERN } from "../utils/decimal";

type PromotionFieldsProps = {
  /** Prefixo dos ids (product/category) para não repetir no DOM. */
  idPrefix: string;
  collapsible?: boolean;
  showActive?: boolean;
  value: PromoForm;
  onChange: (value: PromoForm) => void;
};

/**
 * Bloco "Promoção" compartilhado pelos formulários de produto e categoria.
 * Fica recolhido atrás de "Tem promoção?"; desligar remove a promoção.
 */
export function PromotionFields({
  idPrefix,
  value,
  onChange,
  collapsible = true,
  showActive = true,
}: PromotionFieldsProps) {
  const [open, setOpen] = useState(
    () => value.promoActive || value.promoValue !== "",
  );
  const set = (patch: Partial<PromoForm>) => onChange({ ...value, ...patch });
  const percent = value.promoType === "PERCENT";
  return (
    <>
      {collapsible && (
        <Switch
          className="promotion-fields-toggle"
          label="Tem promoção?"
          checked={open}
          onChange={(event) => {
            setOpen(event.target.checked);
            onChange(
              event.target.checked
                ? { ...value, promoActive: true }
                : emptyPromoForm,
            );
          }}
        />
      )}
      {(!collapsible || open) && (
        <fieldset className="promotion-fields">
          <legend>Promoção</legend>
          <SelectField
            label="Tipo"
            id={`${idPrefix}-promo-type`}
            value={value.promoType}
            onChange={(event) =>
              set({ promoType: event.target.value as PromoForm["promoType"] })
            }
          >
            <option value="PERCENT">Percentual (%)</option>
            <option value="AMOUNT">Valor (R$)</option>
          </SelectField>
          {percent ? (
            <TextField
              label="Desconto (%)"
              id={`${idPrefix}-promo-value`}
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              step={1}
              required={value.promoActive}
              placeholder="Ex.: 20"
              value={value.promoValue}
              onChange={(event) => set({ promoValue: event.target.value })}
            />
          ) : (
            <TextField
              className="money-field"
              label="Desconto (R$)"
              id={`${idPrefix}-promo-value`}
              inputMode="decimal"
              pattern={MONEY_PATTERN}
              title="Use números, ex.: 5,00"
              required={value.promoActive}
              placeholder="5,00"
              value={value.promoValue}
              onChange={(event) => set({ promoValue: event.target.value })}
            />
          )}
          <TextField
            label="Início (opcional)"
            id={`${idPrefix}-promo-start`}
            type="datetime-local"
            value={value.promoStartsAt}
            onChange={(event) => set({ promoStartsAt: event.target.value })}
          />
          <TextField
            label="Fim (opcional)"
            id={`${idPrefix}-promo-end`}
            type="datetime-local"
            min={value.promoStartsAt || undefined}
            value={value.promoEndsAt}
            onChange={(event) => set({ promoEndsAt: event.target.value })}
          />
          {showActive && (
            <Switch
              className="promotion-fields-active"
              label="Promoção ativa"
              checked={value.promoActive}
              onChange={(event) => set({ promoActive: event.target.checked })}
            />
          )}
        </fieldset>
      )}
    </>
  );
}
