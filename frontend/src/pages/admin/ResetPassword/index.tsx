import Login from "../Login";

export default function ResetPassword({ onBack }: { onBack: () => void }) {
  return (
    <Login initialMode="reset" onReturnToLogin={onBack} onEnter={onBack} />
  );
}
