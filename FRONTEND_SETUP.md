# Refatoração com Next.js - Guia de Integração

Você tem agora dois projetos:

## 📁 Estrutura

```
Downloads/
├── mente-mestra/            # Backend Flask
│   ├── app.py              # Servidor Flask
│   ├── db.py               # Banco de dados
│   └── ...
│
└── council-frontend/         # Frontend Next.js (NOVO)
    ├── app/
    ├── components/
    ├── lib/
    └── package.json
```

## 🚀 Como Rodar

### 1. Verificar CORS no Flask

Seu `app.py` precisa permitir requisições do frontend. Adicione no início de `app.py`:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Permite requisições de qualquer origem
```

Instale a dependência:
```bash
pip install flask-cors
```

### 2. Terminal 1 - Flask Backend

```bash
cd mente-mestra
python app.py
# Rodará em http://localhost:5050
```

### 3. Terminal 2 - Next.js Frontend

```bash
cd council-frontend
npm install  # Se não fez ainda
npm run dev
# Rodará em http://localhost:3000
```

### 4. Acessar

Abra o navegador em **http://localhost:3000**

## 🔄 Fluxo

```
Usuário (Browser)
       ↓
Next.js (3000) → Fetch HTTP
       ↓
Flask API (5050)
       ↓
SQLite (council.db) + APIs de IA
```

## ✅ Checklist

- [ ] CORS habilitado no Flask
- [ ] Flask rodando em http://localhost:5050
- [ ] Next.js rodando em http://localhost:3000
- [ ] `.env.local` configurado (já tem default)
- [ ] Conversas aparecem na lista
- [ ] Consegue enviar mensagens

## 🔧 Troubleshooting

### "Failed to fetch"
- Flask não está rodando
- CORS não está habilitado
- URL em `.env.local` está errada

### Estilos não aparecem
- Tailwind CSS precisa de build
- Rode `npm run dev` não `npm start` em desenvolvimento

### Markdown não renderiza
- `marked` deve estar instalado
- Rode `npm install marked`

## 📝 Próximos Passos (Backend)

Depois você pode:
1. Migrar db.py para SQLAlchemy
2. Adicionar autenticação
3. Separar rotas em blueprints
4. Adicionar logging centralizado
5. Deploy em cloud (Render, Railway, etc)

## 🎯 Arquivos Importantes

**Frontend:**
- `components/App.tsx` - Lógica principal
- `lib/api.ts` - Chamadas ao backend
- `lib/types.ts` - Tipos compartilhados

**Backend:**
- `app.py` - Rotas Flask
- `db.py` - Persistência
