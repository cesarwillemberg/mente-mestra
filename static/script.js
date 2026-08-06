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
const usarChairmanEl = document.getElementById("usar-chairman");
const quemChairmanEl = document.getElementById("quem-chairman");
const listaConversasEl = document.getElementById("lista-conversas");
const botaoNovaConversa = document.getElementById("btn-nova-conversa");
const modoSocraticoEl = document.getElementById("modo-socratico");

const btnConfiguracoes = document.getElementById("btn-configuracoes");
const painelConfig = document.getElementById("painel-config");
const configOverlay = document.getElementById("config-overlay");
const btnFecharConfig = document.getElementById("btn-fechar-config");

let conversaAtualId = null;

// ---------- Gerenciar painel de configurações ----------

function abrirPainelConfig() {
  painelConfig.classList.add("ativo");
  configOverlay.classList.add("ativo");
}

function fecharPainelConfig() {
  painelConfig.classList.remove("ativo");
  configOverlay.classList.remove("ativo");
}

btnConfiguracoes.addEventListener("click", abrirPainelConfig);
btnFecharConfig.addEventListener("click", fecharPainelConfig);
configOverlay.addEventListener("click", fecharPainelConfig);

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
  div.innerHTML = `<span class="turno-rotulo">Você perguntou</span>`;
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
// Barra lateral: lista de conversas
// ---------------------------------------------------------------------------

async function carregarConversas() {
  try {
    const resp = await fetch("/conversas");
    const lista = await resp.json();
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
  const resp = await fetch(`/conversas/${id}`);
  if (!resp.ok) return;
  const conversa = await resp.json();
  conversaAtualId = id;
  turnosEl.innerHTML = "";
  conversa.turnos.forEach((turno) => turnosEl.appendChild(renderizarTurnoCompleto(turno)));
  atualizarSidebarAtiva();
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
  conversaAtualId = null;
  turnosEl.innerHTML = "";
  atualizarSidebarAtiva();
  ideiaEl.value = "";
  ideiaEl.focus();
}

botaoNovaConversa.addEventListener("click", novaConversa);

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
  botaoEnviar.textContent = "Consultando...";
  fecharPainelConfig();

  const { bloco, cardsIndividuais, cardChairman } = criarTurnoPendente(mensagem, modelos, chairman);
  turnosEl.appendChild(bloco);
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
      await carregarConversas();
      atualizarSidebarAtiva();
      turnosEl.scrollTop = turnosEl.scrollHeight;
    }
  } catch (e) {
    bloco.innerHTML = `<div class="card"><div class="card-erro">Não foi possível falar com o servidor local: ${e.message}</div></div>`;
  } finally {
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = "Enviar";
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
