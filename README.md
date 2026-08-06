# Mente Mestra

App web local: você escreve uma ideia, ela é enviada em paralelo para múltiplas IAs
(Claude, GPT, Gemini, Grok, Groq, DeepSeek, OpenRouter, Llama Local), cada uma responde
no mesmo formato — pontos fortes, riscos, próximos passos e uma pergunta provocativa —
e, se quiser, uma delas sintetiza tudo num parecer único (o "chairman"). A conversa continua:
você pode mandar uma pergunta de acompanhamento e cada IA lembra do que já foi dito.

Roda 100% na sua máquina. As únicas chamadas de rede são as suas, direto para a
API de cada empresa — nenhum dado passa por um servidor intermediário. O
histórico das conversas fica salvo num arquivo SQLite local (`mente_mestra.db`).

## 1. Instalar as dependências

```bash
cd mente-mestra
python3 -m venv venv
source venv/bin/activate      # no Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configurar as chaves de API

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Abra o `.env` e preencha a chave de cada IA que você quiser usar. Você não precisa
configurar todas — se deixar uma em branco, o card daquele conselheiro só vai
mostrar um aviso, sem quebrar os outros.

Onde pegar cada chave:

| IA | Onde gerar a chave |
|---|---|
| Claude (Anthropic) | https://console.anthropic.com/settings/keys |
| GPT (OpenAI) | https://platform.openai.com/api-keys |
| Gemini (Google) | https://aistudio.google.com/apikey |
| Grok (xAI) | https://console.x.ai |
| Groq | https://console.groq.com/keys |
| DeepSeek | https://platform.deepseek.com/api/keys |
| OpenRouter | https://openrouter.ai/keys |

Guarde as chaves com segurança — o arquivo `.env` nunca deve ser compartilhado
ou subido para um repositório público.

### Rodando um modelo local com Ollama

Se você quiser consultar um modelo 100% local sem pagar nada e sem enviar dados
para nenhuma API, pode usar o **Ollama**.

1. Instale o Ollama em https://ollama.com/download
2. Abra um terminal e baixe um modelo (ex: `ollama pull llama3.2`)
3. Deixe o Ollama aberto — ele vai subir um servidor local em `http://localhost:11434`
4. Pronto! "Llama Local" vai aparecer como um conselheiro no app

Os modelos locais pequenos (Llama 3.2, Phi) são mais rápidos mas seguem menos bem o
prompt-sistema longo e estruturado do projeto — respostas podem ser menos alinhadas
ou mais curtas. Isso é esperado e não é um bug. Se quiser melhor qualidade, considere
um modelo maior (ex: `llama3.1:70b` se tiver GPU) ou use um dos conselheiros pagos.

## 3. Rodar o app

```bash
python app.py
```

Abra **http://localhost:5050** no navegador.

## 4. Usar

1. Escreva sua ideia, projeto ou dúvida na caixa de texto.
2. Marque quais conselheiros você quer convocar (por padrão, todos).
3. Se quiser um parecer único, deixe "Sintetizar em um parecer único" marcado e escolha quem faz esse papel.
4. Clique em "Levar ao conselho" (ou `Ctrl+Enter` / `Cmd+Enter`).
5. A conversa fica na barra lateral. Clique nela pra continuar de onde parou — as IAs
   vão lembrar do que já foi discutido (só a própria resposta de cada uma; se uma IA
   falhou ou não foi convocada num turno, ela simplesmente não "sabe" que ele aconteceu).
6. Em cada resposta, use as abas "Síntese" / "Individuais" pra alternar entre o
   parecer final e a resposta de cada conselheiro isoladamente.
7. "+ Nova conversa" começa um histórico do zero. O × ao lado de cada conversa na
   barra lateral exclui ela permanentemente (junto com todos os turnos salvos).

## Sobre os nomes dos modelos

Cada empresa lança modelos novos com frequência, então os nomes configurados no
`.env.example` (ex: `claude-sonnet-5`, `gpt-5.5`) podem ficar desatualizados com
o tempo. Se um card parar de responder com erro de "modelo não encontrado",
troque o valor da variável correspondente no seu `.env` pelo nome atual, que
você encontra em:

- Claude: https://docs.claude.com/en/docs/about-claude/models
- GPT: https://platform.openai.com/docs/models
- Gemini: https://ai.google.dev/gemini-api/docs/models
- Grok: https://docs.x.ai/developers/models
- Groq: https://console.groq.com/docs/models
- DeepSeek: https://api-docs.deepseek.com/
- OpenRouter: https://openrouter.ai/docs#models
- Llama Local (Ollama): https://ollama.com/library

## Ideias para evoluir o projeto

Coisas que dariam para adicionar depois, quando quiser ir além desta versão:

- **Renomear conversas**: hoje o título é sempre a primeira mensagem; dar pra editar.
- **Exportar em PDF ou Markdown**: gerar um arquivo com a conversa completa pra guardar ou compartilhar.
- **Streaming**: mostrar o texto de cada IA aparecendo palavra por palavra.

## Estrutura do projeto

```
mente-mestra/
├── app.py              # backend Flask — chama as APIs em paralelo, monta histórico por IA
├── db.py                # camada SQLite — conversas e turnos
├── mente_mestra.db      # criado automaticamente na primeira execução
├── requirements.txt
├── .env.example
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
└── README.md
```
