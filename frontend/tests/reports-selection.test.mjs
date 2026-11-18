import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
let server, Reports;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true }, plugins: [{ name: "selected-report-state", enforce: "pre", transform(_code, id) { if (id.endsWith("/Reports/hooks/useReports.ts")) return 'export const useReports = () => globalThis.reportSelectionState;'; } }] });
  ({ default: Reports } = await server.ssrLoadModule("/src/pages/admin/Reports/index.tsx"));
});
after(async () => { await server?.close(); delete globalThis.reportSelectionState; });
function state() {
  const report = { selectedDay: { date: "2026-11-13", revenue: 224 }, selectedLabel: "13/11/2026", period: "7days", periodLabel: "12/11/2026 a 18/11/2026", products: [], days: [], chartDays: [], scenario: "positive", changes: [0, 0, 0], summary: {}, search: "", hasSales: true, formatCurrency: value => `R$ ${value}`, clearCount: 0 };
  report.clearSelectedDay = () => { report.selectedDay = null; report.clearCount++; };
  globalThis.reportSelectionState = report;
  return report;
}
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(node => find(node, predicate)).find(Boolean);
  if (!tree?.props) return undefined;
  return predicate(tree) ? tree : find(tree.props.children, predicate);
}
const render = () => Reports({ onNavigate() {} });
const keyEvent = (overrides = {}) => ({ key: "Escape", defaultPrevented: false, nativeEvent: { isComposing: false }, target: { closest: () => null }, preventDefault() { this.defaultPrevented = true; }, ...overrides });
test("botão mostra ação de voltar e atalho Esc, restaura foco e limpa só a seleção", () => {
  const report = state();
  const button = find(render(), node => node.props?.["aria-keyshortcuts"] === "Escape");
  const html = renderToStaticMarkup(button);
  assert.match(html, /Voltar ao período completo/);
  assert.match(html, /Esc/);
  let focused = false;
  button.props.onClick({ currentTarget: { closest: () => ({ querySelector: () => ({ focus() { focused = true; } }) }) } });
  assert.equal(focused, true);
  assert.equal(report.selectedDay, null);
  assert.equal(report.period, "7days");
  assert.equal(find(render(), node => node.props?.["aria-keyshortcuts"] === "Escape"), undefined);
});
test("Esc volta ao período completo e não interfere em diálogos, menus ou eventos já tratados", () => {
  const report = state();
  const page = render();
  page.props.onKeyDown(keyEvent({ key: "Enter" }));
  page.props.onKeyDown(keyEvent({ defaultPrevented: true }));
  page.props.onKeyDown(keyEvent({ nativeEvent: { isComposing: true } }));
  page.props.onKeyDown(keyEvent({ target: { closest: () => ({}) } }));
  assert.equal(report.clearCount, 0);
  const event = keyEvent();
  page.props.onKeyDown(event);
  assert.equal(report.selectedDay, null);
  assert.equal(report.clearCount, 1);
  assert.equal(event.defaultPrevented, true);
  assert.equal(report.period, "7days");
  page.props.onKeyDown(keyEvent());
  assert.equal(report.clearCount, 1);
});
