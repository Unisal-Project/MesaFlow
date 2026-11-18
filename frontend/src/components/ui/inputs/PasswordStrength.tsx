import { Check, Circle } from "lucide-react";
import { passwordStrength } from "@/utils/password-strength";
import "./passwordStrength.scss";

export function PasswordStrength({
  password,
  id,
}: {
  password: string;
  id: string;
}) {
  const strength = passwordStrength(password);
  return (
    <div
      id={id}
      className={`password-strength password-strength--${strength.level}`}
    >
      <div className="password-strength-heading">
        <span>Força da senha</span>
        <strong aria-live="polite">{strength.label}</strong>
      </div>
      <div
        className="password-strength-bar"
        role="progressbar"
        aria-label="Força da senha"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={password ? strength.score : 0}
        aria-valuetext={strength.label}
      >
        {strength.requirements.map((item, index) => (
          <span
            key={item.id}
            className={
              password && index < strength.score ? "is-filled" : undefined
            }
          />
        ))}
      </div>
      <ul className="password-requirements" aria-label="Requisitos da senha">
        {strength.requirements.map((item) => (
          <li
            key={item.id}
            className={item.met ? "is-met" : undefined}
            aria-label={`${item.met ? "Atendido" : "Pendente"}: ${item.label}`}
          >
            {item.met ? (
              <Check aria-hidden="true" />
            ) : (
              <Circle aria-hidden="true" />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
