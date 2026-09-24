import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { parseNum, todayISO, addMonths, daysBetween, markReceived, normalizeText } from "./App.jsx";

// O pt-PT formata "1900,00 €" com espaços especiais (sem quebra); o teste
// compara com espaços normais.
const pageText = () => document.body.textContent.replace(/\s+/g, " ");

async function openApp() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("button", { name: /^Balanço/ });
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
    await user.click(screen.getByRole("button", { name: /^Balanço/ }));
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
    await user.click(screen.getByRole("button", { name: /^Balanço/ }));
    const box = screen.getByRole("heading", { name: "A receber" }).closest("div").parentElement.parentElement;
    const text = box.textContent.replace(/\s+/g, " ");
    expect(text).toContain("2300,00 €");
    expect(text).toContain("prelabt- gestão de produtos quimicos1500,00 €");
    expect(text).toContain("espomecanica350,00 €");
  });

  it("lucro real por cliente desconta as horas", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: /^Balanço/ }));
    // Escondidinho: 500 recebidos − 0 despesas − 2 h × 15 €
    const row = screen.getAllByText("Escondidinho").find((el) => el.closest("[style*='grid']")).closest("[style*='grid']");
    expect(row.textContent.replace(/\s+/g, " ")).toContain("500,00 €0,00 €500,00 €2 h470,00 €");
  });

  it("mudar a taxa horária recalcula a margem", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: /^Balanço/ }));
    await user.click(screen.getByRole("button", { name: /definições/ }));
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
    await user.click(screen.getByRole("button", { name: /^Notas/ }));
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

describe("markReceived", () => {
  it("marca como recebido e cria o mensal seguinte, pendente", () => {
    const list = [{ id: "a", desc: "Pagamento", amount: 250, date: "2026-10-01", received: false, clientId: "c1", recurrence: "mensal" }];
    const next = markReceived(list, "a");
    expect(next.find((i) => i.id === "a").received).toBe(true);
    const created = next.filter((i) => i.id !== "a");
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ date: "2026-11-01", received: false, amount: 250, clientId: "c1", recurrence: "mensal" });
  });

  it("num pagamento anual cria o do ano seguinte", () => {
    const list = [{ id: "a", desc: "Renovação site", amount: 120, date: "2026-10-01", received: false, clientId: "c1", recurrence: "anual" }];
    const created = markReceived(list, "a").filter((i) => i.id !== "a");
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ date: "2027-10-01", received: false, amount: 120, recurrence: "anual" });
  });

  it("numa compra única só marca como recebido", () => {
    const list = [{ id: "a", desc: "site", amount: 350, date: "2026-09-18", received: false }];
    expect(markReceived(list, "a")).toEqual([{ ...list[0], received: true }]);
  });
});

it("normalizeText ignora acentos e maiúsculas", () => {
  expect(normalizeText("Gestão de Produtos Químicos")).toBe("gestao de produtos quimicos");
});

// Os testes seguintes dependem do dia de hoje (atrasos, objetivo do mês):
// fixam-no em 24/09/2026.
describe("com a data fixa em 24/09/2026", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-24T12:00:00") });
  });
  afterEach(() => vi.useRealTimers());

  it("o separador Balanço mostra os pagamentos em atraso", async () => {
    await openApp();
    expect(screen.getByRole("button", { name: /^Balanço/ }).textContent).toContain("2");
    expect(screen.getByLabelText("2 pagamento(s) em atraso")).toBeTruthy();
  });

  it("objetivo do mês e reserva para impostos", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: /^Balanço/ }));
    const text = pageText();
    expect(text).toContain("Objetivo de setembro");
    expect(text).toContain("600,00 € de 1000,00 €");
    expect(text).toContain("60% recebido");
    expect(text).toContain("faltam 400,00 €");
    expect(text).toContain("mês anterior: 625,00 € (−4%)");
    expect(text).toContain("pôr de parte para impostos (25%): 475,00 € · livre para gastar: 1425,00 €");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("60");
  });

  it("marcar como recebido em 'A receber' atualiza o saldo e cria o mês seguinte", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: /^Balanço/ }));
    await user.click(screen.getByRole("button", { name: /marcar 250,00\s€ de Escondidinho como recebido/ }));
    expect(pageText()).toContain("saldo2150,00 €");

    await user.click(screen.getByRole("button", { name: "Receitas" }));
    const escondidinho = [...document.querySelectorAll(".row-hover")]
      .map((r) => r.textContent.replace(/\s+/g, " "))
      .filter((t) => t.includes("Escondidinho") && t.includes("250,00 €"));
    expect(escondidinho.find((t) => t.includes("01/10/2026"))).toContain("recebido");
    expect(escondidinho.find((t) => t.includes("01/11/2026"))).toContain("pendente");
  });
});

describe("pesquisa", () => {
  it("encontra em receitas, clientes, notas e calendário, sem ligar a acentos", async () => {
    const user = await openApp();
    await user.type(screen.getByLabelText("Pesquisar"), "escond");
    const text = pageText();
    for (const group of ["Receitas · 4", "Clientes · 1", "Notas · 2", "Calendário · 2"]) expect(text).toContain(group);

    await user.clear(screen.getByLabelText("Pesquisar"));
    await user.type(screen.getByLabelText("Pesquisar"), "gestao");
    expect(pageText()).toContain("prelabt- gestão de produtos quimicos");
  });

  it("clicar num resultado abre o separador certo", async () => {
    const user = await openApp();
    await user.type(screen.getByLabelText("Pesquisar"), "espomecanica");
    await user.click(screen.getAllByRole("button", { name: /espomecanica/ })[0]);
    expect(screen.getByLabelText("Pesquisar").value).toBe("");
    expect(screen.getByPlaceholderText("Pagamento (ex: mensalidade, sinal…)")).toBeTruthy();
  });

  it("diz quando não encontra nada", async () => {
    const user = await openApp();
    await user.type(screen.getByLabelText("Pesquisar"), "xyzxyz");
    expect(pageText()).toContain("Nada encontrado para “xyzxyz”");
  });
});

describe("exportar CSV", () => {
  it("gera o ficheiro das receitas para o Excel português", async () => {
    let saved;
    URL.createObjectURL = vi.fn((blob) => {
      saved = blob;
      return "blob:csv";
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Receitas" }));
    await user.click(screen.getByRole("button", { name: /CSV/ }));
    await waitFor(() => expect(saved).toBeTruthy());

    const csv = await saved.text();
    const lines = csv.replace(/^\ufeff/, "").split("\r\n");
    expect(lines[0]).toBe("data;cliente;pagamento;valor;estado;recorrência");
    expect(lines).toContain("19/09/2026;prelabt- gestão de produtos quimicos;Pagamento;1500,00;pendente;Compra única");
    expect(lines).toContain("01/10/2026;Escondidinho;Pagamento;250,00;pendente;Mensal");
    expect(lines).toHaveLength(14); // cabeçalho + 13 receitas
    expect(click.mock.contexts[0].download).toBe("innovatweb-receitas-tudo.csv");
    click.mockRestore();
  });
});

describe("telemóvel", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn((query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => {
    delete window.matchMedia;
  });

  it("receitas aparecem em cartões, com o valor e o estado visíveis", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Receitas" }));
    expect(screen.queryByText("recorrência")).toBeNull();
    const card = [...document.querySelectorAll(".row-hover")].find((r) => r.textContent.includes("1500,00"));
    const text = card.textContent.replace(/\s+/g, " ");
    expect(text).toContain("prelabt- gestão de produtos quimicos");
    expect(text).toContain("19/09/2026 · Pagamento");
    expect(within(card).getByRole("button", { name: "pendente" })).toBeTruthy();
  });
});
