import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { parseNum, todayISO, addMonths, daysBetween } from "./App.jsx";

// O pt-PT formata "1900,00 €" com espaços especiais (sem quebra); o teste
// compara com espaços normais.
const pageText = () => document.body.textContent.replace(/\s+/g, " ");

async function openApp() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("button", { name: "Balanço" });
  await waitFor(() => expect(screen.queryByText("A carregar os teus dados…")).toBeNull());
  return user;
}

describe("parseNum", () => {
  it.each([
    ["1.500", 1500],
    ["1.500,50", 1500.5],
    ["1500,50", 1500.5],
    ["123.45", 123.45],
    ["1.5", 1.5],
    ["12.000.000", 12000000],
    ["1 500 €", 1500],
    ["0,5", 0.5],
  ])("lê %s como %d", (input, expected) => {
    expect(parseNum(input)).toBe(expected);
  });

  it.each(["", "abc", null, undefined])("rejeita %s", (input) => {
    expect(parseNum(input)).toBeNaN();
  });
});

describe("datas", () => {
  it("addMonths fica no último dia quando o mês de destino é mais curto", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-08-31", 1)).toBe("2026-09-30");
    expect(addMonths("2026-09-01", 1)).toBe("2026-10-01");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("daysBetween conta dias de atraso (positivo) e em falta (negativo)", () => {
    expect(daysBetween("2026-09-19", "2026-09-24")).toBe(5);
    expect(daysBetween("2026-10-01", "2026-09-24")).toBe(-7);
    expect(daysBetween("2026-09-24", "2026-09-24")).toBe(0);
  });

  it("todayISO usa a data de Portugal, não a UTC", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 23:30 UTC = 00:30 do dia seguinte em Lisboa (verão)
    vi.setSystemTime(new Date("2026-09-24T23:30:00Z"));
    try {
      expect(todayISO()).toBe("2026-09-25");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Balanço com os dados de partida", () => {
  it("mostra saldo, previsto e margem certos", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Balanço" }));
    const text = pageText();
    expect(text).toContain("receitas2025,00 €");
    expect(text).toContain("despesas125,00 €");
    expect(text).toContain("saldo1900,00 €");
    expect(text).toContain("saldo previsto4200,00 €");
    expect(text).toContain("73.3%");
    expect(text).toContain("lucro real (set. em diante)440,00 €");
  });

  it("a receber agrupa os pendentes por cliente (2300 €)", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Balanço" }));
    const box = screen.getByRole("heading", { name: "A receber" }).closest("div").parentElement.parentElement;
    const text = box.textContent.replace(/\s+/g, " ");
    expect(text).toContain("2300,00 €");
    expect(text).toContain("prelabt- gestão de produtos quimicos1500,00 €");
    expect(text).toContain("espomecanica350,00 €");
  });

  it("lucro real por cliente desconta as horas", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Balanço" }));
    // Escondidinho: 500 recebidos − 0 despesas − 2 h × 15 €
    const row = screen.getAllByText("Escondidinho").find((el) => el.closest("[style*='grid']")).closest("[style*='grid']");
    expect(row.textContent.replace(/\s+/g, " ")).toContain("500,00 €0,00 €500,00 €2 h470,00 €");
  });

  it("mudar a taxa horária recalcula a margem", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Balanço" }));
    await user.click(screen.getByRole("button", { name: /mudar taxa ou mês/ }));
    const rate = screen.getByLabelText("taxa horária (€/h)");
    await user.clear(rate);
    await user.type(rate, "20");
    await user.click(screen.getByRole("button", { name: "guardar" }));
    const text = pageText();
    expect(text).toContain("mão de obra (20€/h)80,00 €");
    expect(text).toContain("70.0%");
  });
});

describe("Receitas", () => {
  async function addIncome(user, { desc, amount, date, recurrence }) {
    await user.click(screen.getByRole("button", { name: "Receitas" }));
    await user.type(screen.getByPlaceholderText("Pagamento (ex: mensalidade, sinal…)"), desc);
    await user.type(screen.getByPlaceholderText("0.00"), amount);
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: date } });
    const recurrenceSelect = screen
      .getAllByRole("combobox")
      .find((s) => within(s).queryByRole("option", { name: "Compra única" }));
    await user.selectOptions(recurrenceSelect, recurrence);
    await user.click(screen.getByRole("button", { name: "adicionar" }));
  }

  const rowsWith = (text) =>
    [...document.querySelectorAll(".row-hover")]
      .filter((r) => r.textContent.includes(text))
      .map((r) => r.textContent.replace(/\s+/g, " "));

  it("uma receita mensal recebida cria já a do mês seguinte, pendente", async () => {
    const user = await openApp();
    await addIncome(user, { desc: "Avença teste", amount: "1.000", date: "2026-11-30", recurrence: "mensal" });
    const rows = rowsWith("Avença teste");
    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual(expect.stringContaining("30/11/2026"));
    expect(rows.find((r) => r.includes("30/11/2026"))).toContain("1000,00 €recebido");
    // 30/11 + 1 mês = 30/12, pendente
    expect(rows.find((r) => r.includes("30/12/2026"))).toContain("1000,00 €pendente");
  });

  it("as alterações ficam guardadas", async () => {
    const user = await openApp();
    await addIncome(user, { desc: "Receita guardada", amount: "10", date: "2026-09-20", recurrence: "compra_unica" });
    await waitFor(() => expect(localStorage.getItem("controlo-pessoal-data")).toContain("Receita guardada"));
  });
});

describe("Apagar", () => {
  it("só apaga depois de confirmar", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Notas" }));
    const note = "escondidinho deve 100€ mes de agosto";
    expect(screen.getByText(note)).toBeTruthy();

    const row = screen.getByText(note).closest(".row-hover");
    await user.click(within(row).getByRole("button", { name: "remover" }));
    expect(screen.getByText(note)).toBeTruthy();
    await user.click(within(row).getByRole("button", { name: "não" }));
    expect(screen.getByText(note)).toBeTruthy();

    await user.click(within(row).getByRole("button", { name: "remover" }));
    await user.click(within(row).getByRole("button", { name: "sim" }));
    expect(screen.queryByText(note)).toBeNull();
  });

  it("avisa quantos registos ficam sem cliente", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Clientes" }));
    const row = screen.getByText("Escondidinho").closest(".row-hover");
    await user.click(within(row).getByRole("button", { name: "remover" }));
    expect(within(row).getByRole("alertdialog").textContent).toContain("tem 6 registos ligados, que ficam sem cliente");
  });
});
