# I_Numeros

Reconhecedor de dígitos manuscritos de 0 a 9. O usuário desenha um número em um quadro na tela e o sistema tenta identificar qual dígito foi desenhado, exibindo o resultado e a probabilidade de cada classe.

É um projeto full-stack que combina um frontend em Next.js com um backend em Python. O reconhecimento é feito por uma rede neural perceptron multicamadas (MLP) treinada com o conjunto de dados MNIST, executada por meio da biblioteca scikit-learn.

## Sobre o projeto

O fluxo começa no navegador. O usuário desenha um dígito com o mouse ou com o dedo, em um canvas de 336 por 336 pixels. Ao soltar o traço, o desenho é convertido em uma matriz de 28 por 28 valores, em que cada valor representa a intensidade média de tinta em cada célula. Essa matriz é enviada a uma API em Python.

O backend recebe os 784 valores e aplica um pré-processamento antes de entregá-los à rede neural. Esse pré-processamento reproduz o mesmo padrão usado no MNIST: a imagem é binarizada para identificar onde há tinta, o conteúdo é recortado na região que contém o desenho, redimensionado para 20 por 20 pixels e centralizado pelo centro de massa. Isso é necessário porque o modelo foi treinado com imagens normalizadas dessa forma, e ignorar essa etapa degradaria bastante a precisão das predições.

Depois do pré-processamento, a matriz é passada ao modelo, que devolve para cada dígito (de 0 a 9) uma probabilidade. O dígito com maior probabilidade é apresentado como resposta, junto com a confiança e o tempo de inferência. A interface também mostra, lado a lado, o desenho digitalizado, a versão binarizada e a entrada efetivamente enviada à rede, o que ajuda a entender o que acontece com o desenho em cada etapa.

## Estrutura do código

O projeto está organizado em duas pastas principais.

- `backend/` contém o servidor Python e tudo relacionado ao modelo.
- `frontend/` contém a aplicação web Next.js.

### Backend

- `app.py`: aplicação FastAPI. Expõe os endpoints `/health` e `/predict`, além de uma rota raiz informativa em `/`.
- `preprocess.py`: funções de binarização, recorte, redimensionamento e centralização do desenho.
- `mnist_data.py`: carrega o MNIST para treinamento e teste. Se os arquivos não estiverem presentes localmente, faz o download a partir de dois espelhos diferentes até que um deles tenha sucesso.
- `train.py`: treina a rede neural e salva o modelo resultante em `model/digit_mlp.joblib`, além de um arquivo `model/meta.json` com os metadados do treinamento.
- `test_api.py`: utilitário que envia amostras reais do MNIST à API em execução e compara a predição com o rótulo esperado.

O modelo é uma MLP com arquitetura 784-400-200-10, ou seja, uma camada de entrada com 784 neurônios (um por pixel), duas camadas ocultas com 400 e 200 neurônios e uma camada de saída com 10 neurônios (um por dígito). No treinamento foi usado o otimizador Adam com taxa de aprendizado inicial de 0,001, além de parada antecipada (early stopping) para evitar sobreajuste.

Para aumentar a quantidade de dados de treinamento, o script `train.py` gera 25 mil amostras adicionais a partir do conjunto original do MNIST. Essas amostras são variações criadas por pequenos deslocamentos na imagem (entre dois pixels negativos e dois positivos em cada eixo) e por operações morfológicas de dilatação e erosão, o que simula traços mais grossos ou mais finos. Com isso, o conjunto de treino passa de 60 mil para 85 mil amostras.

No treinamento registrado, o modelo atingiu uma acurácia de 98,53% no conjunto de teste, com um tempo total de treinamento de aproximadamente 13 minutos em uma máquina comum.

### Frontend

- `app/page.tsx`: página principal. Controla o estado, verifica periodicamente se a API está online e coordena o desenho com a predição.
- `components/DrawCanvas.tsx`: quadro de desenho. Captura ponteiros (mouse, toque), converte o traço para a matriz 28 por 28 e oferece os botões desfazer e limpar, com histórico das últimas 40 ações.
- `components/MatrixPreview.tsx` e `components/MatrixStrip.tsx`: mostram as três representações da matriz (digitalizada, binarizada e entrada da rede).
- `components/PredictionPanel.tsx`: mostra o dígito reconhecido, a confiança, o tempo de inferência e uma barra com a probabilidade de cada classe.
- `lib/api.ts`: funções de comunicação com a API, incluindo a predição e a checagem de saúde.

A interface está em português e usa Tailwind CSS para o estilo. O indicador no topo da página avisa se a API está acessível; a checagem é feita a cada 15 segundos.

## Pré-requisitos

Para rodar o projeto são necessários:

- Python 3.10 ou superior.
- Node.js 20 ou superior, com npm.
- Um navegador moderno.

## Como rodar

O frontend e o backend são processos separados. Há um script `start.sh` na raiz que sobe ambos ao mesmo tempo, mas também é possível executá-los manualmente, o que costuma facilitar a leitura dos logs.

### 1. Backend

Entre na pasta `backend`, crie um ambiente virtual e instale as dependências.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Os dados do MNIST e o modelo treinado já estão incluídos nas pastas `backend/data` e `backend/model`, então não é preciso gerá-los de novo para usar a aplicação. Caso queira refazer o modelo do zero, execute `python train.py`, que baixa os dados caso não existam, treina a rede e salva o modelo atualizado na pasta `model`.

Inicie o servidor com o uvicorn. A porta padrão é a 8000.

```bash
./venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
```

### 2. Frontend

Em outro terminal, entre na pasta `frontend` e instale as dependências do Node.

```bash
cd frontend
npm install
```

O frontend precisa saber em que endereço a API está disponível. Por padrão, ele usa `http://localhost:8000`. Para mudar, crie um arquivo `.env.local` na pasta `frontend` com a seguinte linha:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Inicie o servidor de desenvolvimento.

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

### Opção com o script único

Se preferir, basta executar o `start.sh` da raiz. Ele inicia o uvicorn em segundo plano e depois sobe o Next.js. Ao encerrar o processo, o servidor Python também é finalizado.

```bash
./start.sh
```

## Como testar

Com a API em execução, é possível validar a acurácia real do serviço usando amostras do MNIST. O script `test_api.py` envia um número configurável de exemplos de teste à API e informa quantos foram reconhecidos corretamente.

```bash
# primeiro argumento: semente aleatória; segundo: quantidade de amostras
python test_api.py 42 50
```

A saída lista, para cada amostra, o dígito esperado e o predito, além da confiança, e no final mostra a contagem de acertos.

## Notas

- O backend permite requisições de qualquer origem (CORS liberado), o que é conveniente para desenvolvimento, mas deve ser restringido se o projeto for publicado em produção.
- O modelo é carregado em memória na primeira requisição e mantido ali enquanto o processo estiver ativo. Por isso, a primeira predição costuma ser um pouco mais lenta.
- O quadro aceita dois apagamentos via botão desfazer, e o traço só é reconhecido ao soltar o ponteiro. Um desenho vazio gera uma mensagem de erro da API em vez de uma predição.
- A conversão do desenho para a matriz usa a intensidade média de tinta por célula, então traços grossos, finos ou inclinados geralmente funcionam bem. Funciona de forma mais confiável quando o número é desenhado de forma razoavelmente centralizada e ocupando boa parte do quadro.
