# 🧠 Reconhecedor de Dígitos MNIST no Navegador (TensorFlow.js)

Aplicação web interativa para reconhecimento de dígitos manuscritos (0 a 9) em tempo real, executada diretamente no navegador via **TensorFlow.js**, sem necessidade de servidor ou conexão com a internet após o carregamento inicial.

---

## 📁 Estrutura do Projeto

```text
digits-28/
├── index.html            # Aplicação web completa (Canvas + Inferência TF.js + UI Responsiva)
├── treinar_mnist.py      # Script Python para treino, avaliação (Matriz de Confusão) e exportação
├── modelo_web/           # Pasta onde ficam os pesos exportados
│   ├── model.json        # Arquitetura e manifesto do modelo TensorFlow.js
│   └── group1-shard1of1.bin # Pesos binários da rede convolucional
└── README.md
```

---

## 🚀 Como Executar

### 1. Treinar e Exportar o Modelo (Python / Google Colab)
Execute o script [treinar_mnist.py](file:///C:/Users/07872123185/Documents/digits-28/treinar_mnist.py) ou copie o código para um notebook no [Google Colab](https://colab.research.google.com):

```bash
python treinar_mnist.py
```

O script irá:
- Treinar a CNN no dataset MNIST completo (60.000 treino / 10.000 teste).
- Avaliar a acurácia, matriz de confusão 10×10 e identificar os dígitos mais confundidos.
- Exportar os arquivos para a pasta `modelo_web/`.

### 2. Testar Localmente
Como o navegador bloqueia carregamento de arquivos locais (`model.json`) via protocolo `file://` (CORS), inicie um servidor web local simples:

```bash
# Com Python:
python -m http.server 8000

# Ou com Node.js (npx):
npx serve .
```

Abra o navegador em `http://localhost:8000`.

---

## 🌐 Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Faça commit e push dos arquivos (`index.html`, `modelo_web/` e `README.md`):
   ```bash
   git init
   git add .
   git commit -m "feat: Reconhecedor MNIST com TensorFlow.js"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings > Pages**.
4. Em **Build and deployment**, selecione:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)`
5. Clique em **Save**. O link do site funcionando estará disponível em poucos minutos.
