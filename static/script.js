const NOMES = {
  claude: { nome: "Claude", empresa: "Anthropic" },
  gpt: { nome: "GPT", empresa: "OpenAI" },
  gemini: { nome: "Gemini", empresa: "Google" },
  grok: { nome: "Grok", empresa: "xAI" },
  groq: { nome: "Groq", empresa: "Groq (Llama 3.3)" },
  deepseek: { nome: "DeepSeek", empresa: "DeepSeek" },
  openrouter: { nome: "OpenRouter", empresa: "OpenRouter (grátis)" },
  ollama: { nome: "Llama Local", empresa: "Ollama (seu PC)" },
};

const chipsContainer = document.getElementById("chips");
const quorumEl = document.getElementById("quorum");
const botaoEnviar = document.getElementById("btn-enviar");
const ideiaEl = document.getElementById("ideia");
const turnosEl = document.getElementById("turnos");
const chatContainerEl = document.querySelector(".chat-container");
const usarChairmanEl = document.getElementById("usar-chairman");
const quemChairmanEl = document.getElementById("quem-chairman");
const listaConversasEl = document.getElementById("lista-conversas");
const botaoNovaConversa = document.getElementById("btn-nova-conversa");
const modoSocraticoEl = document.getElementById("modo-socratico");
const tituloHeaderEl = document.getElementById("chat-titulo");
const btnHome = document.getElementById("btn-home");

const TITULO_PADRAO = tituloHeaderEl.textContent;

const btnConfiguracoes = document.getElementById("btn-configuracoes");
const btnResumoConselho = document.getElementById("btn-resumo-conselho");
const resumoConselhoEl = document.getElementById("resumo-conselho");
const painelConfig = document.getElementById("painel-config");
const configOverlay = document.getElementById("config-overlay");
const btnFecharConfig = document.getElementById("btn-fechar-config");

const btnUsuario = document.getElementById("btn-usuario");
const dropdownUsuario = document.getElementById("dropdown-usuario");

const appShellEl = document.querySelector(".app-shell");
const btnFecharSidebar = document.getElementById("btn-fechar-sidebar");
const btnPesquisarConversas = document.getElementById("btn-pesquisar-conversas");
const modalPesquisa = document.getElementById("modal-pesquisa");
const modalPesquisaOverlay = document.getElementById("modal-pesquisa-overlay");
const inputPesquisaConversas = document.getElementById("input-pesquisa-conversas");
const listaPesquisaConversasEl = document.getElementById("lista-pesquisa-conversas");

let conversaAtualId = null;
let conversasCache = [];

// ---------- Tela cheia: todas as conversas ----------

const btnNavConversas = document.getElementById("btn-nav-conversas");
const telaChats = document.getElementById("tela-chats");
const inputTelaChatsPesquisa = document.getElementById("input-tela-chats-pesquisa");
const listaTelaChatsEl = document.getElementById("lista-tela-chats");
const filtroWrap = document.querySelector(".tela-chats-filtro-wrap");
const btnTelaChatsFiltro = document.getElementById("btn-tela-chats-filtro");
const menuFiltroTelaChats = document.getElementById("menu-filtro-tela-chats");
const rotuloFiltroTelaChats = document.getElementById("rotulo-filtro-tela-chats");
const btnSelecionarChats = document.getElementById("btn-selecionar-chats");
const btnCancelarSelecao = document.getElementById("btn-cancelar-selecao");
const btnExcluirSelecionadas = document.getElementById("btn-excluir-selecionadas");
const contagemSelecaoChatsEl = document.getElementById("contagem-selecao-chats");
const btnTelaChatsNovaConversa = document.getElementById("btn-tela-chats-nova-conversa");

let filtroChatsAtual = "todas";
let idsSelecionados = new Set();

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatarTempoRelativo(isoStr) {
  const data = new Date(isoStr);
  const agora = new Date();
  const diffMin = Math.floor((agora - data) / 60000);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras} hora${diffHoras === 1 ? "" : "s"}`;

  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diffDias = Math.round((inicioHoje - inicioData) / 86400000);

  if (diffDias === 1) return "ontem";
  if (diffDias < 7) return `há ${diffDias} dias`;

  const mes = MESES_ABREV[data.getMonth()];
  return data.getFullYear() === agora.getFullYear()
    ? `${data.getDate()} ${mes}`
    : `${data.getDate()} ${mes} ${data.getFullYear()}`;
}

function sairModoSelecao() {
  telaChats.classList.remove("modo-selecao");
  idsSelecionados.clear();
  atualizarContagemSelecao();
}

function atualizarContagemSelecao() {
  contagemSelecaoChatsEl.textContent = `${idsSelecionados.size} selecionada${idsSelecionados.size === 1 ? "" : "s"}`;
  btnExcluirSelecionadas.disabled = idsSelecionados.size === 0;
}

function renderizarTelaChats() {
  const termo = inputTelaChatsPesquisa.value.trim().toLowerCase();

  if (filtroChatsAtual === "compartilhadas") {
    listaTelaChatsEl.innerHTML = `<li class="tela-chats-vazio">Nenhuma conversa compartilhada ainda.</li>`;
    return;
  }

  const lista = termo
    ? conversasCache.filter((conv) => conv.titulo.toLowerCase().includes(termo))
    : conversasCache;

  listaTelaChatsEl.innerHTML = "";
  if (lista.length === 0) {
    listaTelaChatsEl.innerHTML = `<li class="tela-chats-vazio">Nenhuma conversa encontrada.</li>`;
    return;
  }

  lista.forEach((conv) => {
    const li = document.createElement("li");
    li.className = "item-tela-chats";
    li.innerHTML = `
      <input type="checkbox" class="checkbox-item-chats" data-id="${conv.id}" ${idsSelecionados.has(conv.id) ? "checked" : ""} />
      <button class="abrir-tela-chat" type="button" data-id="${conv.id}">${escaparTexto(conv.titulo)}</button>
      <span class="tempo-tela-chat">${formatarTempoRelativo(conv.atualizado_em)}</span>
    `;
    listaTelaChatsEl.appendChild(li);
  });
}

function abrirTelaChats() {
  filtroChatsAtual = "todas";
  rotuloFiltroTelaChats.textContent = "Todas";
  menuFiltroTelaChats.querySelectorAll(".item-filtro-chats").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.filtro === "todas");
  });
  filtroWrap.classList.remove("aberto");
  sairModoSelecao();
  inputTelaChatsPesquisa.value = "";
  telaChats.classList.add("ativo");
  renderizarTelaChats();
}

function fecharTelaChats() {
  telaChats.classList.remove("ativo");
  filtroWrap.classList.remove("aberto");
}

btnNavConversas.addEventListener("click", abrirTelaChats);

inputTelaChatsPesquisa.addEventListener("input", renderizarTelaChats);

btnTelaChatsFiltro.addEventListener("click", (e) => {
  e.stopPropagation();
  filtroWrap.classList.toggle("aberto");
});

document.addEventListener("click", (e) => {
  if (!filtroWrap.classList.contains("aberto")) return;
  if (!filtroWrap.contains(e.target)) filtroWrap.classList.remove("aberto");
});

menuFiltroTelaChats.addEventListener("click", (e) => {
  const item = e.target.closest(".item-filtro-chats");
  if (!item) return;
  filtroChatsAtual = item.dataset.filtro;
  rotuloFiltroTelaChats.textContent = item.textContent.trim().replace(/✓$/, "").trim();
  menuFiltroTelaChats.querySelectorAll(".item-filtro-chats").forEach((el) => el.classList.remove("ativo"));
  item.classList.add("ativo");
  filtroWrap.classList.remove("aberto");
  renderizarTelaChats();
});

btnSelecionarChats.addEventListener("click", () => {
  telaChats.classList.add("modo-selecao");
  idsSelecionados.clear();
  atualizarContagemSelecao();
  renderizarTelaChats();
});

btnCancelarSelecao.addEventListener("click", () => {
  sairModoSelecao();
  renderizarTelaChats();
});

btnTelaChatsNovaConversa.addEventListener("click", () => {
  fecharTelaChats();
  novaConversa();
});

listaTelaChatsEl.addEventListener("click", (e) => {
  const checkbox = e.target.closest(".checkbox-item-chats");
  if (checkbox) {
    const id = Number(checkbox.dataset.id);
    checkbox.checked ? idsSelecionados.add(id) : idsSelecionados.delete(id);
    atualizarContagemSelecao();
    return;
  }

  const abrir = e.target.closest(".abrir-tela-chat");
  if (!abrir) return;
  const id = Number(abrir.dataset.id);

  if (telaChats.classList.contains("modo-selecao")) {
    idsSelecionados.has(id) ? idsSelecionados.delete(id) : idsSelecionados.add(id);
    atualizarContagemSelecao();
    renderizarTelaChats();
    return;
  }

  fecharTelaChats();
  abrirConversa(id);
});

btnExcluirSelecionadas.addEventListener("click", async () => {
  if (idsSelecionados.size === 0) return;
  const quantidade = idsSelecionados.size;
  if (!window.confirm(`Excluir ${quantidade} conversa${quantidade === 1 ? "" : "s"}? Essa ação não pode ser desfeita.`)) return;

  await Promise.all(Array.from(idsSelecionados).map((id) => fetch(`/conversas/${id}`, { method: "DELETE" })));

  if (idsSelecionados.has(conversaAtualId)) novaConversa();
  sairModoSelecao();
  await carregarConversas();
  renderizarTelaChats();
});

// ---------- Gerenciar painel de configurações ----------

function abrirPainelConfig() {
  fecharTelaChats();
  painelConfig.classList.add("ativo");
  configOverlay.classList.add("ativo");
}

function fecharPainelConfig() {
  painelConfig.classList.remove("ativo");
  configOverlay.classList.remove("ativo");
}

btnConfiguracoes.addEventListener("click", () => {
  fecharDropdownUsuario();
  abrirPainelConfig();
});
btnResumoConselho.addEventListener("click", abrirPainelConfig);
btnFecharConfig.addEventListener("click", fecharPainelConfig);
configOverlay.addEventListener("click", fecharPainelConfig);

// ---------- Gerenciar dropdown de usuário ----------

function abrirDropdownUsuario() {
  dropdownUsuario.classList.add("ativo");
  btnUsuario.setAttribute("aria-expanded", "true");
}

function fecharDropdownUsuario() {
  dropdownUsuario.classList.remove("ativo");
  btnUsuario.setAttribute("aria-expanded", "false");
}

btnUsuario.addEventListener("click", (evento) => {
  evento.stopPropagation();
  const aberto = dropdownUsuario.classList.contains("ativo");
  aberto ? fecharDropdownUsuario() : abrirDropdownUsuario();
});

document.addEventListener("click", (evento) => {
  if (!dropdownUsuario.classList.contains("ativo")) return;
  if (!dropdownUsuario.contains(evento.target) && evento.target !== btnUsuario) {
    fecharDropdownUsuario();
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    fecharDropdownUsuario();
    fecharModalPesquisa();
    fecharTelaChats();
  }
});

dropdownUsuario.querySelectorAll("[data-acao]").forEach((item) => {
  item.addEventListener("click", fecharDropdownUsuario);
});

// ---------- Colapsar/abrir a barra lateral ----------

btnFecharSidebar.addEventListener("click", () => {
  const fechada = appShellEl.classList.toggle("sidebar-fechada");
  btnFecharSidebar.title = fechada ? "Abrir barra lateral" : "Fechar barra lateral";
});

// ---------- Modal de pesquisa de conversas ----------

function abrirModalPesquisa() {
  fecharTelaChats();
  modalPesquisa.classList.add("ativo");
  modalPesquisaOverlay.classList.add("ativo");
  renderizarResultadoPesquisa(conversasCache);
  inputPesquisaConversas.value = "";
  inputPesquisaConversas.focus();
}

function fecharModalPesquisa() {
  modalPesquisa.classList.remove("ativo");
  modalPesquisaOverlay.classList.remove("ativo");
}

function renderizarResultadoPesquisa(lista) {
  listaPesquisaConversasEl.innerHTML = "";
  if (lista.length === 0) {
    listaPesquisaConversasEl.innerHTML = `<li class="pesquisa-vazia">Nenhuma conversa encontrada</li>`;
    return;
  }
  lista.forEach((conv) => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="abrir-conversa-pesquisa" type="button" data-id="${conv.id}">${escaparTexto(conv.titulo)}</button>`;
    listaPesquisaConversasEl.appendChild(li);
  });
}

btnPesquisarConversas.addEventListener("click", abrirModalPesquisa);
modalPesquisaOverlay.addEventListener("click", fecharModalPesquisa);

inputPesquisaConversas.addEventListener("input", () => {
  const termo = inputPesquisaConversas.value.trim().toLowerCase();
  const filtradas = termo
    ? conversasCache.filter((conv) => conv.titulo.toLowerCase().includes(termo))
    : conversasCache;
  renderizarResultadoPesquisa(filtradas);
});

listaPesquisaConversasEl.addEventListener("click", (e) => {
  const abrir = e.target.closest(".abrir-conversa-pesquisa");
  if (!abrir) return;
  fecharModalPesquisa();
  abrirConversa(Number(abrir.dataset.id));
});

// ---------------------------------------------------------------------------
// Convocação de conselheiros / chairman (painel de entrada)
// ---------------------------------------------------------------------------

function checkboxesMarcados() {
  return Array.from(chipsContainer.querySelectorAll("input[type=checkbox]"));
}

function atualizarQuorum() {
  const total = checkboxesMarcados().length;
  const marcados = checkboxesMarcados().filter((c) => c.checked).length;
  quorumEl.textContent = `${marcados} de ${total} conselheiros convocados`;
  resumoConselhoEl.textContent = `${marcados} conselheiro${marcados === 1 ? "" : "s"}`;
}

chipsContainer.addEventListener("change", atualizarQuorum);
atualizarQuorum();

function atualizarEstadoChairman() {
  quemChairmanEl.disabled = !usarChairmanEl.checked;
}
usarChairmanEl.addEventListener("change", atualizarEstadoChairman);
atualizarEstadoChairman();

// ---------------------------------------------------------------------------
// Markdown -> HTML (respostas das IAs variam de estilo, então usamos uma
// biblioteca de markdown real em vez de um parser caseiro)
// ---------------------------------------------------------------------------

marked.setOptions({ breaks: true });

function renderizarCorpo(texto) {
  return DOMPurify.sanitize(marked.parse(texto));
}

function escaparTexto(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Cards individuais (um por conselheiro)
// ---------------------------------------------------------------------------

function criarCardCarregando(chave) {
  const info = NOMES[chave];
  const card = document.createElement("div");
  card.className = "card";
  card.style.setProperty("--cor-card", `var(--${chave})`);
  card.innerHTML = `
    <div class="card-cabecalho">
      <span class="card-nome">${info.nome}</span>
      <span class="card-empresa">${info.empresa}</span>
    </div>
    <div class="card-carregando"><span class="pontinho"></span> pensando...</div>
  `;
  return card;
}

function preencherCard(card, resultado) {
  const corpo = card.querySelector(".card-carregando");
  if (resultado.ok) {
    const div = document.createElement("div");
    div.className = "card-corpo";
    div.innerHTML = renderizarCorpo(resultado.texto);
    corpo.replaceWith(div);
  } else {
    const div = document.createElement("div");
    div.className = "card-erro";
    div.textContent = `Não respondeu: ${resultado.erro}`;
    corpo.replaceWith(div);
  }
}

function construirCardResultadoEstatico(chave, resultado) {
  const card = criarCardCarregando(chave);
  preencherCard(card, resultado);
  return card;
}

// ---------------------------------------------------------------------------
// Card do chairman (síntese)
// ---------------------------------------------------------------------------

function criarCardCarregandoChairman(chave) {
  const info = NOMES[chave];
  const card = document.createElement("div");
  card.className = "card card-chairman";
  card.style.setProperty("--cor-card", `var(--${chave})`);
  card.innerHTML = `
    <div class="card-cabecalho">
      <span class="card-nome">Síntese por ${info.nome}</span>
      <span class="card-empresa">${info.empresa}</span>
    </div>
    <div class="card-carregando"><span class="pontinho"></span> lendo as respostas dos conselheiros e sintetizando...</div>
  `;
  return card;
}

function preencherCardChairman(card, resultado) {
  const corpo = card.querySelector(".card-carregando");
  if (resultado.ok) {
    const div = document.createElement("div");
    div.className = "card-corpo";
    div.innerHTML = renderizarCorpo(resultado.texto);
    corpo.replaceWith(div);
  } else {
    const div = document.createElement("div");
    div.className = "card-erro";
    div.textContent = `Não foi possível sintetizar: ${resultado.erro}`;
    corpo.replaceWith(div);
  }
}

function construirCardChairmanEstatico(chairman) {
  const card = criarCardCarregandoChairman(chairman.quem);
  preencherCardChairman(card, chairman.resultado);
  return card;
}

// ---------------------------------------------------------------------------
// Abas "Síntese" / "Individuais" dentro de um turno
// ---------------------------------------------------------------------------

function configurarAbas(abasEl, contSintese, contIndividuais) {
  abasEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".aba");
    if (!btn) return;
    abasEl.querySelectorAll(".aba").forEach((a) => a.classList.remove("aba-ativa"));
    btn.classList.add("aba-ativa");
    const alvo = btn.dataset.aba;
    contSintese.hidden = alvo !== "sintese";
    contIndividuais.hidden = alvo !== "individuais";
  });
}

function criarBlocoAbas() {
  const abas = document.createElement("div");
  abas.className = "turno-abas";
  abas.innerHTML = `
    <button class="aba aba-ativa" type="button" data-aba="sintese">Síntese</button>
    <button class="aba" type="button" data-aba="individuais">Individuais</button>
  `;
  return abas;
}

// ---------------------------------------------------------------------------
// Um "turno" = a mensagem do usuário + as respostas daquele momento da conversa
// ---------------------------------------------------------------------------

function criarCabecalhoUsuario(mensagem) {
  const div = document.createElement("div");
  div.className = "turno-usuario";
  const p = document.createElement("p");
  p.textContent = mensagem;
  // div.innerHTML = `<span class="turno-rotulo">Você perguntou</span>`;
  div.appendChild(p);
  return div;
}

// Turno já resolvido (usado ao abrir uma conversa salva no histórico)
function renderizarTurnoCompleto(turno) {
  const bloco = document.createElement("div");
  bloco.className = "turno";
  bloco.appendChild(criarCabecalhoUsuario(turno.mensagem_usuario));

  const modelos = Object.keys(turno.individuais);

  if (turno.chairman) {
    const abas = criarBlocoAbas();
    bloco.appendChild(abas);

    const contSintese = document.createElement("div");
    contSintese.className = "turno-conteudo";
    contSintese.dataset.conteudo = "sintese";
    contSintese.appendChild(construirCardChairmanEstatico(turno.chairman));

    const contIndividuais = document.createElement("div");
    contIndividuais.className = "turno-conteudo resultados";
    contIndividuais.dataset.conteudo = "individuais";
    contIndividuais.hidden = true;
    modelos.forEach((chave) => contIndividuais.appendChild(construirCardResultadoEstatico(chave, turno.individuais[chave])));

    bloco.appendChild(contSintese);
    bloco.appendChild(contIndividuais);
    configurarAbas(abas, contSintese, contIndividuais);
  } else {
    const grid = document.createElement("div");
    grid.className = "resultados";
    grid.style.marginTop = "0.8rem";
    modelos.forEach((chave) => grid.appendChild(construirCardResultadoEstatico(chave, turno.individuais[chave])));
    bloco.appendChild(grid);
  }

  return bloco;
}

// Turno em andamento (usado ao enviar uma mensagem nova) — devolve o bloco já
// no DOM (com cards "pensando...") e referências pra preencher depois.
function criarTurnoPendente(mensagem, modelos, chairman) {
  const bloco = document.createElement("div");
  bloco.className = "turno";
  bloco.appendChild(criarCabecalhoUsuario(mensagem));

  const cardsIndividuais = {};
  let cardChairman = null;

  if (chairman) {
    const abas = criarBlocoAbas();
    bloco.appendChild(abas);

    const contSintese = document.createElement("div");
    contSintese.className = "turno-conteudo";
    contSintese.dataset.conteudo = "sintese";
    cardChairman = criarCardCarregandoChairman(chairman);
    contSintese.appendChild(cardChairman);

    const contIndividuais = document.createElement("div");
    contIndividuais.className = "turno-conteudo resultados";
    contIndividuais.dataset.conteudo = "individuais";
    contIndividuais.hidden = true;
    modelos.forEach((chave) => {
      const card = criarCardCarregando(chave);
      cardsIndividuais[chave] = card;
      contIndividuais.appendChild(card);
    });

    bloco.appendChild(contSintese);
    bloco.appendChild(contIndividuais);
    configurarAbas(abas, contSintese, contIndividuais);
  } else {
    const grid = document.createElement("div");
    grid.className = "resultados";
    grid.style.marginTop = "0.8rem";
    modelos.forEach((chave) => {
      const card = criarCardCarregando(chave);
      cardsIndividuais[chave] = card;
      grid.appendChild(card);
    });
    bloco.appendChild(grid);
  }

  return { bloco, cardsIndividuais, cardChairman };
}

// ---------------------------------------------------------------------------
// Cabeçalho: mostra o título da conversa aberta (ou o texto padrão da marca
// quando não há conversa aberta)
// ---------------------------------------------------------------------------

function atualizarCabecalho(titulo) {
  tituloHeaderEl.textContent = titulo || TITULO_PADRAO;
}

function atualizarEstadoVazio() {
  chatContainerEl.classList.toggle("vazio", turnosEl.children.length === 0);
}

// ---------------------------------------------------------------------------
// Barra lateral: lista de conversas
// ---------------------------------------------------------------------------

async function carregarConversas() {
  try {
    const resp = await fetch("/conversas");
    const lista = await resp.json();
    conversasCache = lista;
    renderizarListaConversas(lista);
  } catch (e) {
    listaConversasEl.innerHTML = `<li class="lista-vazia">Não foi possível carregar o histórico.</li>`;
  }
}

function renderizarListaConversas(lista) {
  listaConversasEl.innerHTML = "";
  if (lista.length === 0) {
    listaConversasEl.innerHTML = `<li class="lista-vazia">Nenhuma conversa ainda</li>`;
    return;
  }
  lista.forEach((conv) => {
    const li = document.createElement("li");
    li.className = "item-conversa" + (conv.id === conversaAtualId ? " ativa" : "");
    li.innerHTML = `
      <button class="abrir-conversa" type="button" data-id="${conv.id}">${escaparTexto(conv.titulo)}</button>
      <button class="excluir-conversa" type="button" data-id="${conv.id}" title="Excluir conversa">×</button>
    `;
    listaConversasEl.appendChild(li);
  });
}

function atualizarSidebarAtiva() {
  listaConversasEl.querySelectorAll(".item-conversa").forEach((li) => li.classList.remove("ativa"));
  if (conversaAtualId != null) {
    const btn = listaConversasEl.querySelector(`.abrir-conversa[data-id="${conversaAtualId}"]`);
    if (btn) btn.closest(".item-conversa").classList.add("ativa");
  }
}

async function abrirConversa(id) {
  fecharTelaChats();
  const resp = await fetch(`/conversas/${id}`);
  if (!resp.ok) return;
  const conversa = await resp.json();
  conversaAtualId = id;
  turnosEl.innerHTML = "";
  conversa.turnos.forEach((turno) => turnosEl.appendChild(renderizarTurnoCompleto(turno)));
  atualizarEstadoVazio();
  atualizarSidebarAtiva();
  atualizarCabecalho(conversa.titulo);
  ideiaEl.value = "";
  ideiaEl.focus();
  turnosEl.scrollTop = turnosEl.scrollHeight;
}

async function excluirConversa(id) {
  if (!window.confirm("Excluir esta conversa? Essa ação não pode ser desfeita.")) return;
  await fetch(`/conversas/${id}`, { method: "DELETE" });
  if (id === conversaAtualId) novaConversa();
  await carregarConversas();
}

function novaConversa() {
  fecharTelaChats();
  conversaAtualId = null;
  turnosEl.innerHTML = "";
  atualizarEstadoVazio();
  atualizarSidebarAtiva();
  atualizarCabecalho(null);
  ideiaEl.value = "";
  ideiaEl.focus();
}

botaoNovaConversa.addEventListener("click", novaConversa);
btnHome.addEventListener("click", novaConversa);

listaConversasEl.addEventListener("click", (e) => {
  const abrir = e.target.closest(".abrir-conversa");
  if (abrir) {
    abrirConversa(Number(abrir.dataset.id));
    return;
  }
  const excluir = e.target.closest(".excluir-conversa");
  if (excluir) {
    excluirConversa(Number(excluir.dataset.id));
  }
});

// ---------------------------------------------------------------------------
// Enviar mensagem ao conselho
// ---------------------------------------------------------------------------

async function enviar() {
  const mensagem = ideiaEl.value.trim();
  const modelos = checkboxesMarcados()
    .filter((c) => c.checked)
    .map((c) => c.value);

  if (!mensagem) {
    ideiaEl.focus();
    return;
  }
  if (modelos.length === 0) return;

  const chairman = usarChairmanEl.checked ? quemChairmanEl.value : null;

  botaoEnviar.disabled = true;
  fecharPainelConfig();

  const { bloco, cardsIndividuais, cardChairman } = criarTurnoPendente(mensagem, modelos, chairman);
  turnosEl.appendChild(bloco);
  atualizarEstadoVazio();
  ideiaEl.value = "";
  ideiaEl.style.height = "auto";
  turnosEl.scrollTop = turnosEl.scrollHeight;

  try {
    const resp = await fetch("/consultar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ideia: mensagem,
        modelos,
        chairman,
        conversa_id: conversaAtualId,
        modo_socratico: modoSocraticoEl.checked
      }),
    });
    const dados = await resp.json();

    if (!resp.ok) {
      bloco.innerHTML = `<div class="card"><div class="card-erro">${dados.erro || "Algo deu errado."}</div></div>`;
    } else {
      conversaAtualId = dados.conversa_id;
      Object.entries(dados.individuais || {}).forEach(([chave, resultado]) => {
        if (cardsIndividuais[chave]) preencherCard(cardsIndividuais[chave], resultado);
      });
      if (dados.chairman && cardChairman) preencherCardChairman(cardChairman, dados.chairman.resultado);
      atualizarCabecalho(dados.titulo);
      await carregarConversas();
      atualizarSidebarAtiva();
      turnosEl.scrollTop = turnosEl.scrollHeight;
    }
  } catch (e) {
    bloco.innerHTML = `<div class="card"><div class="card-erro">Não foi possível falar com o servidor local: ${e.message}</div></div>`;
  } finally {
    botaoEnviar.disabled = false;
  }
}

botaoEnviar.addEventListener("click", enviar);
ideiaEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enviar();
});

ideiaEl.addEventListener("input", () => {
  ideiaEl.style.height = "auto";
  ideiaEl.style.height = Math.min(ideiaEl.scrollHeight, 120) + "px";
});

carregarConversas();
