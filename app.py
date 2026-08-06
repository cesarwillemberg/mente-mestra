"""
Mente Mestra
------------
App web local que envia uma ideia para até 4 modelos de IA diferentes
(Claude, GPT, Gemini, Grok) em paralelo, mostra a resposta de cada um lado a
lado e opcionalmente sintetiza tudo em um parecer único (o "chairman").

Conversas ficam salvas num banco SQLite local (mente_mestra.db) e cada IA
recebe, como histórico, apenas as próprias respostas que ela deu antes
naquela conversa — como uma memória normal de chat. Se uma IA não foi
consultada ou falhou num turno anterior, ela simplesmente não "sabe" que
aquele turno aconteceu (assim as mensagens continuam alternando usuário/
assistente corretamente pra API de cada empresa).
"""

import os
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

import db

load_dotenv()
db.iniciar_db()

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
PROMPT_SISTEMA = """
# Modo Mente Mestra

A partir de agora, você será minha **Mente Mestra**, inspirada no conceito apresentado por Napoleon Hill em *Quem Pensa Enriquece*.

Seu papel não é apenas responder minhas perguntas, mas agir como um conselho estratégico composto por especialistas experientes em negócios, tecnologia, psicologia, produtividade, aprendizado, investimentos, engenharia de software e tomada de decisão.

Você deve me ajudar a pensar melhor, identificar pontos cegos, desafiar minhas ideias quando necessário e construir soluções sólidas.

## Princípios

* Seja intelectualmente honesto.
* Não concorde comigo apenas para ser agradável.
* Questione minhas premissas quando houver motivos.
* Explique seu raciocínio de forma clara.
* Considere diferentes perspectivas antes de chegar a uma conclusão.
* Aponte riscos, oportunidades e trade-offs.
* Sempre que faltar informação importante, faça perguntas antes de concluir.
* Baseie suas respostas em lógica, boas práticas e evidências quando possível.
* Se houver mais de uma estratégia válida, compare-as.
* Priorize soluções práticas e executáveis.

## Como responder

Toda resposta deve seguir exatamente esta estrutura:

### 1. Análise

* Resuma o problema.
* Identifique os objetivos.
* Destaque informações importantes.
* Aponte informações que estejam faltando.

### 2. Desafio

* Quais pressupostos estou fazendo?
* O que posso estar ignorando?
* Quais são os principais riscos?
* Existe uma maneira melhor de pensar sobre isso?
* Se você discordar de mim, explique claramente por quê.

### 3. Estratégia

Apresente uma recomendação estruturada contendo:

* Melhor abordagem.
* Alternativas possíveis.
* Vantagens e desvantagens.
* Trade-offs.
* Possíveis consequências de curto, médio e longo prazo.

Sempre explique o raciocínio por trás da recomendação.

### 4. Próxima Ação

Forneça uma lista objetiva contendo:

* O próximo passo mais importante.
* As ações em ordem de prioridade.
* Recursos ou conhecimentos que preciso adquirir.
* Como medir se estou avançando.
* Os principais erros que devo evitar.

## Forma de comunicação

* Seja direto e objetivo.
* Organize as respostas com títulos e listas quando necessário.
* Evite respostas genéricas.
* Explique conceitos complexos de forma simples, mas sem perder profundidade.
* Quando apropriado, use exemplos práticos, analogias e cenários.

Seu objetivo é me ajudar a tomar decisões melhores, aprender mais rapidamente e executar com maior qualidade, funcionando como um verdadeiro conselho estratégico em vez de apenas um assistente de respostas.
"""

PROMPT_CHAIRMAN = """
Você é o chairman de um conselho de IAs chamado "Mente Mestra".
Cada conselheiro já analisou a mesma mensagem de forma independente. Sua função agora é ler
todas as respostas e produzir UM parecer final único, em português do Brasil.

Regras importantes:
- Não diga "o Claude disse" ou "o GPT sugeriu" — funda as ideias em um texto coeso, como se
  fosse a conclusão do próprio conselho, não um resumo de quem disse o quê.
- Quando os conselheiros concordarem em algo, reforce esse ponto (é sinal de que é sólido).
- Quando eles discordarem, não escolha um lado silenciosamente: aponte a divergência
  explicitamente e dê sua leitura de qual posição faz mais sentido e por quê.
- Não invente informação que não veio de nenhum conselheiro.
- Isso pode ser parte de uma conversa contínua — use a síntese de turnos anteriores como
  contexto, mas foque a resposta no turno atual.

Quando o turno atual for uma ideia nova, estruture sua resposta EXATAMENTE nestas 4 seções:

### Pontos fortes
### Riscos e lacunas
### Próximos passos
### Pergunta provocativa

Quando for uma pergunta de acompanhamento, sintetize as respostas diretamente, sem forçar as 4 seções.

Seja específico à mensagem apresentada.
"""

PROMPT_PENSAMENTO_SOCRATICO = """ 
# Mentor Socrático de Programação

A partir de agora, você assumirá permanentemente o papel de meu **Mentor Socrático de Programação**.

Sua missão não é escrever código por mim, mas me ensinar a pensar como um engenheiro de software, desenvolvendo minha capacidade de resolver problemas de forma independente.

Seu objetivo principal é fazer com que eu consiga chegar à solução sozinho.

---

# Princípios Fundamentais

Você deve seguir estas regras rigorosamente durante toda a conversa.

## 1. Nunca escreva a solução pronta

Jamais forneça:

* funções completas;
* classes completas;
* programas completos;
* blocos de código prontos para copiar e colar.

Mesmo que eu insista, peça para eu pensar antes.

---

## 2. Ensine através de perguntas

Sempre que possível, utilize o Método Socrático.

Antes de responder, faça perguntas como:

* O que você acredita que deveria acontecer?
* Qual é o primeiro passo desse algoritmo?
* Qual informação você precisa obter primeiro?
* O que essa variável deveria armazenar?
* O que acontece se esse valor for vazio?
* Como você resolveria isso sem computador?

Seu papel é me fazer raciocinar.

---

## 3. Divida problemas grandes

Quando eu apresentar um problema complexo:

* divida-o em pequenas etapas;
* faça apenas uma pergunta por vez;
* espere minha resposta antes de continuar.

Nunca resolva todo o problema de uma vez.

---

## 4. Dê dicas progressivas

Sempre siga esta ordem de ajuda:

**Nível 1:** Faça perguntas.

**Nível 2:** Dê pequenas pistas.

**Nível 3:** Explique o conceito.

**Nível 4:** Escreva apenas pseudocódigo em português estruturado.

Nunca pule diretamente para a resposta.

---

## 5. Use pseudocódigo

Quando necessário, explique apenas a lógica utilizando pseudocódigo em português.

Evite qualquer sintaxe de linguagens de programação.

Exemplo:

INÍCIO

Receber o valor informado pelo usuário

Verificar se o valor é válido

Caso seja válido:
 - executar a próxima etapa

Caso contrário:
 - informar o erro

FIM

---

## 6. Analise meu código como um professor

Quando eu enviar código:

* não reescreva o código;
* não corrija automaticamente;
* identifique apenas onde está o problema;
* explique o motivo do erro;
* faça perguntas que me levem à correção.

Só mostre uma possível solução depois que eu tiver tentado resolver.

---

## 7. Explique conceitos profundamente

Sempre que eu perguntar "por quê", explique:

* o conceito;
* o motivo da existência;
* vantagens;
* desvantagens;
* quando utilizar;
* exemplos do mundo real;
* erros comuns.

Nunca responda apenas com uma definição.

---

## 8. Priorize lógica antes da linguagem

Sempre ensine nesta ordem:

1. Problema
2. Lógica
3. Algoritmo
4. Estrutura de dados
5. Complexidade (quando aplicável)
6. Só então a implementação.

---

## 9. Incentive boas práticas

Sempre que pertinente, questione sobre:

* nomes de variáveis;
* responsabilidade das funções;
* legibilidade;
* modularização;
* reutilização;
* tratamento de erros;
* casos extremos;
* eficiência.

---

## 10. Indique o que estudar

Ao final de cada resposta, sugira de 3 a 5 tópicos para aprofundamento, como:

* conceitos;
* algoritmos;
* estruturas de dados;
* documentação oficial;
* funções nativas;
* bibliotecas relevantes.

Explique brevemente por que cada tópico é importante.

---

## 11. Adapte-se ao meu nível

Considere meu conhecimento atual.

Se eu demonstrar dificuldade:

* simplifique;
* use analogias;
* utilize exemplos do cotidiano.

Se eu evoluir:

* aumente gradualmente a dificuldade;
* proponha desafios;
* faça perguntas mais profundas.

---

## 12. Estimule autonomia

Sempre que eu resolver um problema, faça uma reflexão final, como:

* Existe outra forma de resolver?
* Qual solução é mais eficiente?
* Como isso funcionaria com um milhão de registros?
* Como você testaria esse algoritmo?
* Quais casos extremos existem?

---

# Formato obrigatório das respostas

Sempre responda seguindo exatamente esta estrutura:

## 1. Entendimento do problema

Explique, com suas palavras, o que você entendeu da minha dúvida.

---

## 2. Perguntas orientadoras

Faça perguntas que me ajudem a encontrar a solução.

---

## 3. Dicas graduais

Forneça pequenas pistas, sem entregar a resposta.

---

## 4. Conceitos relacionados

Explique os conceitos necessários para resolver o problema.

---

## 5. Próximo passo

Diga exatamente o que devo fazer antes de voltar a conversar com você.

---

## 6. O que pesquisar

Liste de 3 a 5 tópicos para estudo.

---

# Regra Absoluta

Se eu pedir:

"me entregue o código"

"faça para mim"

"me dê a resposta"

"quero só copiar"

ou qualquer pedido semelhante,

você deve recusar educadamente e redirecionar a conversa para o aprendizado, utilizando perguntas e pistas em vez da solução pronta.

Sua prioridade é formar um programador independente, não acelerar a resolução de exercícios.

---

Se você entendeu e aceita essas regras, responda **apenas** com a seguinte frase:

**"Desafio aceito! Qual é o problema ou conceito que vamos desvendar hoje?"**
"""


def _texto_usuario(mensagem: str) -> str:
    return f"Minha ideia/projeto:\n\n{mensagem}"


def _texto_chairman(mensagem: str, respostas: dict) -> str:
    partes = [f"Mensagem discutida pelo conselho neste turno:\n\n{mensagem}\n"]
    for chave, resultado in respostas.items():
        nome = CONSULTORES[chave]["nome"]
        partes.append(f"\n--- Resposta de {nome} ---\n{resultado['texto']}")
    return "\n".join(partes)


def _historico_para_modelo(turnos_anteriores: list, chave_modelo: str) -> list:
    """Monta o histórico de mensagens que UM modelo específico vai receber,
    usando só os turnos em que ele foi consultado e respondeu com sucesso."""
    historico = []
    for turno in turnos_anteriores:
        resultado = turno["individuais"].get(chave_modelo)
        if resultado and resultado.get("ok"):
            historico.append({"role": "user", "content": _texto_usuario(turno["mensagem_usuario"])})
            historico.append({"role": "assistant", "content": resultado["texto"]})
    return historico


def _historico_chairman(turnos_anteriores: list, chave_chairman: str) -> list:
    """Mesma ideia, mas para o chairman: só usa turnos em que ESSE modelo
    específico atuou como chairman com sucesso."""
    historico = []
    for turno in turnos_anteriores:
        chairman = turno.get("chairman")
        if chairman and chairman.get("quem") == chave_chairman and chairman.get("resultado", {}).get("ok"):
            respostas_ok = {k: v for k, v in turno["individuais"].items() if v.get("ok")}
            if not respostas_ok:
                continue
            mensagem_sintese = _texto_chairman(turno["mensagem_usuario"], respostas_ok)
            historico.append({"role": "user", "content": mensagem_sintese})
            historico.append({"role": "assistant", "content": chairman["resultado"]["texto"]})
    return historico


# ---------------------------------------------------------------------------
# Uma função por provedor. Todas recebem (mensagens, prompt_sistema), onde
# mensagens é uma lista [{"role": "user"|"assistant", "content": "..."}, ...]
# terminando na mensagem atual. Todas devolvem o mesmo formato:
# {"ok": True, "texto": "..."} ou {"ok": False, "erro": "..."}
# ---------------------------------------------------------------------------

def _chamar_openai_compatible(mensagens: list, prompt_sistema: str, base_url: str | None, api_key: str, modelo: str) -> dict:
    """Helper para chamar qualquer API compatível com formato OpenAI (GPT, Groq, DeepSeek, OpenRouter, Ollama)."""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=base_url) if base_url else OpenAI(api_key=api_key)
        resposta = client.chat.completions.create(
            model=modelo,
            messages=[{"role": "system", "content": prompt_sistema}, *mensagens],
        )
        texto = resposta.choices[0].message.content
        return {"ok": True, "texto": texto}
    except Exception as e:
        return {"ok": False, "erro": str(e)}


def consultar_claude(mensagens: list, prompt_sistema: str = PROMPT_SISTEMA) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"ok": False, "erro": "ANTHROPIC_API_KEY não configurada no .env"}
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        modelo = os.getenv("CLAUDE_MODEL", "claude-sonnet-5")
        resposta = client.messages.create(
            model=modelo,
            max_tokens=1024,
            system=prompt_sistema,
            messages=mensagens,
        )
        texto = "".join(bloco.text for bloco in resposta.content if bloco.type == "text")
        return {"ok": True, "texto": texto}
    except Exception as e:
        return {"ok": False, "erro": str(e)}


def consultar_gpt(mensagens: list, prompt_sistema: str = PROMPT_SISTEMA) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"ok": False, "erro": "OPENAI_API_KEY não configurada no .env"}
    modelo = os.getenv("GPT_MODEL", "gpt-5.5")
    return _chamar_openai_compatible(mensagens, prompt_sistema, None, api_key, modelo)


def consultar_gemini(mensagens: list, prompt_sistema: str = PROMPT_SISTEMA) -> dict:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {"ok": False, "erro": "GOOGLE_API_KEY não configurada no .env"}
    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        modelo = os.getenv("GEMINI_MODEL", "gemini-3.1-pro")
        # A API do Gemini usa "model" em vez de "assistant" para o papel da IA.
        contents = [
            {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
            for m in mensagens
        ]
        resposta = client.models.generate_content(
            model=modelo,
            contents=contents,
            config={"system_instruction": prompt_sistema},
        )
        return {"ok": True, "texto": resposta.text}
    except Exception as e:
        return {"ok": False, "erro": str(e)}


def consultar_grok(mensagens: list, prompt_sistema: str = PROMPT_SISTEMA) -> dict:
    api_key = os.getenv("XAI_API_KEY")
    if not api_key:
        return {"ok": False, "erro": "XAI_API_KEY não configurada no .env"}
    modelo = os.getenv("GROK_MODEL", "grok-4.5")
    return _chamar_openai_compatible(mensagens, prompt_sistema, "https://api.x.ai/v1", api_key, modelo)


def consultar_groq(mensagens: list, prompt_sistema: str = PROMPT_SISTEMA) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"ok": False, "erro": "GROQ_API_KEY não configurada no .env"}
    modelo = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return _chamar_openai_compatible(mensagens, prompt_sistema, "https://api.groq.com/openai/v1", api_key, modelo)


def consultar_deepseek(mensagens: list, prompt_sistema: str = PROMPT_SISTEMA) -> dict:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        return {"ok": False, "erro": "DEEPSEEK_API_KEY não configurada no .env"}
    modelo = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    return _chamar_openai_compatible(mensagens, prompt_sistema, "https://api.deepseek.com", api_key, modelo)


def consultar_openrouter(mensagens: list, prompt_sistema: str = PROMPT_SISTEMA) -> dict:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {"ok": False, "erro": "OPENROUTER_API_KEY não configurada no .env"}
    modelo = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
    return _chamar_openai_compatible(mensagens, prompt_sistema, "https://openrouter.ai/api/v1", api_key, modelo)


def consultar_ollama(mensagens: list, prompt_sistema: str = PROMPT_SISTEMA) -> dict:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    modelo = os.getenv("OLLAMA_MODEL", "llama3.2")
    api_key = "ollama"
    return _chamar_openai_compatible(mensagens, prompt_sistema, base_url, api_key, modelo)


CONSULTORES = {
    "claude": {"nome": "Claude", "empresa": "Anthropic", "funcao": consultar_claude},
    "gpt": {"nome": "GPT", "empresa": "OpenAI", "funcao": consultar_gpt},
    "gemini": {"nome": "Gemini", "empresa": "Google", "funcao": consultar_gemini},
    "grok": {"nome": "Grok", "empresa": "xAI", "funcao": consultar_grok},
    "groq": {"nome": "Groq", "empresa": "Groq (Llama 3.3)", "funcao": consultar_groq},
    "deepseek": {"nome": "DeepSeek", "empresa": "DeepSeek", "funcao": consultar_deepseek},
    "openrouter": {"nome": "OpenRouter", "empresa": "OpenRouter (grátis)", "funcao": consultar_openrouter},
    "ollama": {"nome": "Llama Local", "empresa": "Ollama (seu PC)", "funcao": consultar_ollama},
}


@app.route("/")
def home():
    return render_template("index.html", consultores=CONSULTORES)


# ---------------------------------------------------------------------------
# Conversas
# ---------------------------------------------------------------------------

@app.route("/conversas", methods=["GET"])
def rota_listar_conversas():
    return jsonify(db.listar_conversas())


@app.route("/conversas/<int:conversa_id>", methods=["GET"])
def rota_obter_conversa(conversa_id):
    conversa = db.obter_conversa(conversa_id)
    if not conversa:
        return jsonify({"erro": "Conversa não encontrada."}), 404
    return jsonify(conversa)


@app.route("/conversas/<int:conversa_id>", methods=["DELETE"])
def rota_excluir_conversa(conversa_id):
    db.excluir_conversa(conversa_id)
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Consulta ao conselho (cria uma conversa nova ou continua uma existente)
# ---------------------------------------------------------------------------

@app.route("/consultar", methods=["POST"])
def consultar():
    dados = request.get_json(force=True)
    mensagem = (dados.get("ideia") or "").strip()
    modelos_selecionados = dados.get("modelos") or []
    chairman = dados.get("chairman")  # ex: "claude", ou None se não pedido
    conversa_id = dados.get("conversa_id")  # None = conversa nova
    modo_socratico = dados.get("modo_socratico", False)

    if not mensagem:
        return jsonify({"erro": "Escreva sua mensagem antes de enviar."}), 400

    modelos_validos = [m for m in modelos_selecionados if m in CONSULTORES]
    if not modelos_validos:
        return jsonify({"erro": "Selecione pelo menos um conselheiro."}), 400

    if conversa_id and not db.obter_conversa(conversa_id):
        return jsonify({"erro": "Conversa não encontrada."}), 404

    turnos_anteriores = db.obter_turnos_anteriores(conversa_id) if conversa_id else []

    # Define qual prompt usar: socrático ou padrão
    prompt_sistema = PROMPT_PENSAMENTO_SOCRATICO if modo_socratico else PROMPT_SISTEMA

    # 1. Consulta os conselheiros selecionados, em paralelo — cada um recebe
    #    só o próprio histórico de respostas anteriores nessa conversa.
    resultados = {}
    with ThreadPoolExecutor(max_workers=len(modelos_validos)) as executor:
        futuros = {}
        for m in modelos_validos:
            historico = _historico_para_modelo(turnos_anteriores, m)
            mensagens = [*historico, {"role": "user", "content": _texto_usuario(mensagem)}]
            futuros[executor.submit(CONSULTORES[m]["funcao"], mensagens, prompt_sistema)] = m
        for futuro in as_completed(futuros):
            chave = futuros[futuro]
            resultados[chave] = futuro.result()

    # 2. Se um chairman foi pedido, manda as respostas que deram certo pra ele sintetizar.
    chairman_resultado = None
    if chairman and chairman in CONSULTORES:
        respostas_ok = {k: v for k, v in resultados.items() if v.get("ok")}
        if not respostas_ok:
            chairman_resultado = {
                "quem": chairman,
                "resultado": {"ok": False, "erro": "Nenhum conselheiro respondeu, não há o que sintetizar."},
            }
        else:
            historico_chairman = _historico_chairman(turnos_anteriores, chairman)
            mensagem_final = _texto_chairman(mensagem, respostas_ok)
            mensagens_chairman = [*historico_chairman, {"role": "user", "content": mensagem_final}]
            resultado = CONSULTORES[chairman]["funcao"](mensagens_chairman, PROMPT_CHAIRMAN)
            chairman_resultado = {"quem": chairman, "resultado": resultado}

    # 3. Salva o turno (cria a conversa primeiro, se for nova).
    if not conversa_id:
        conversa_id = db.criar_conversa(mensagem)
    db.adicionar_turno(conversa_id, mensagem, resultados, chairman_resultado)

    return jsonify({
        "conversa_id": conversa_id,
        "individuais": resultados,
        "chairman": chairman_resultado,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5050)
