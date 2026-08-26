import { classNames } from "../shared/classNames";
export type OrderStep = { id: string; label: string };
type OrderProgressProps = { steps: OrderStep[]; currentId: string; canceled?: boolean };
export function OrderProgress({ steps, currentId, canceled }: OrderProgressProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentId);
  return <ol className="order-steps">{steps.map((step, index) => <li key={step.id} className={classNames("step", index < currentIndex && "done", step.id === currentId && "current", canceled && step.id === currentId && "canceled")}>{step.label}</li>)}</ol>;
}
