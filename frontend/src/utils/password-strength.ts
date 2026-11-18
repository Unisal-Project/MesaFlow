export function passwordRequirements(password: string) {
  return [
    {
      id: "length",
      label: "Mínimo de 8 caracteres",
      met: password.length >= 8,
    },
    {
      id: "uppercase",
      label: "Uma letra maiúscula",
      met: /\p{Lu}/u.test(password),
    },
    {
      id: "lowercase",
      label: "Uma letra minúscula",
      met: /\p{Ll}/u.test(password),
    },
    { id: "number", label: "Um número", met: /[0-9]/.test(password) },
    {
      id: "symbol",
      label: "Um símbolo, como @ ou !",
      met: /[^\p{L}\p{N}\s]/u.test(password),
    },
  ];
}

export function passwordStrength(password: string) {
  const requirements = passwordRequirements(password);
  const score = requirements.filter((item) => item.met).length;
  const level = !password
    ? "empty"
    : score <= 2
      ? "weak"
      : score < 5
        ? "medium"
        : "strong";
  const label = {
    empty: "Não informada",
    weak: "Fraca",
    medium: "Média",
    strong: "Forte",
  }[level];
  return {
    requirements,
    score,
    level,
    label,
    valid: score === 5 && password.length <= 128,
  };
}
