"""
Script de Treinamento, Avaliação e Exportação do Modelo MNIST para TensorFlow.js
Atividade: Reconhecimento de Dígitos no Navegador
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

print(f"TensorFlow Version: {tf.__version__}")

# ==========================================
# PARTE 1 · Treinar
# ==========================================
print("\n--- [Parte 1] Carregando e Normalizando Dataset MNIST ---")
(x_tr, y_tr), (x_te, y_te) = keras.datasets.mnist.load_data()
x_tr = (x_tr / 255.0).astype('float32')[..., None]
x_te = (x_te / 255.0).astype('float32')[..., None]

print(f"Treino: {x_tr.shape[0]} imagens de 28x28x1")
print(f"Teste:  {x_te.shape[0]} imagens de 28x28x1")

# Definição da Arquitetura da Rede Convolucional (CNN)
# Requisitos: entrada 28x28x1, pelo menos 2 camadas convolucionais, saída Dense(10, softmax)
modelo = keras.Sequential([
    keras.Input(shape=(28, 28, 1)),
    
    # 1ª Camada Convolucional + MaxPooling (extração de features de baixo nível: bordas, cantos)
    layers.Conv2D(32, kernel_size=(3, 3), activation='relu', padding='same'),
    layers.MaxPooling2D(pool_size=(2, 2)),
    
    # 2ª Camada Convolucional + MaxPooling (extração de features de alto nível: curvas, laços)
    layers.Conv2D(64, kernel_size=(3, 3), activation='relu', padding='same'),
    layers.MaxPooling2D(pool_size=(2, 2)),
    
    # Classificador Denso
    layers.Flatten(),
    layers.Dropout(0.25),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.25),
    layers.Dense(10, activation='softmax')
])

modelo.summary()

# Compilação
modelo.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# Callback EarlyStopping com restore_best_weights=True
early_stopping = keras.callbacks.EarlyStopping(
    monitor='val_loss',
    patience=3,
    restore_best_weights=True,
    verbose=1
)

# Treinamento com 10% para validação
history = modelo.fit(
    x_tr, y_tr,
    epochs=15,
    batch_size=64,
    validation_split=0.1,
    callbacks=[early_stopping],
    verbose=1
)

# ==========================================
# PARTE 2 · Avaliar antes de exportar
# ==========================================
print("\n--- [Parte 2] Avaliação do Modelo ---")

# 1. Acurácia no conjunto de teste
test_loss, test_acc = modelo.evaluate(x_te, y_te, verbose=0)
print(f"\n👉 Acurácia no conjunto de teste: {test_acc * 100:.2f}% (Loss: {test_loss:.4f})")

# Predições para o conjunto de teste completo
y_pred_probs = modelo.predict(x_te, verbose=0)
y_pred = np.argmax(y_pred_probs, axis=1)

# 2. Matriz de Confusão 10 × 10
cm = confusion_matrix(y_te, y_pred)
print("\n👉 Matriz de Confusão 10x10:")
print(cm)

# 3. Identificar os dois dígitos que o modelo mais confunde entre si
cm_errors = cm.copy()
np.fill_diagonal(cm_errors, 0) # Zeramos a diagonal para analisar apenas os erros

# Maior erro direcional (A previsto como B)
origem, previsto = np.unravel_index(np.argmax(cm_errors), cm_errors.shape)
max_erros = cm_errors[origem, previsto]

# Maior par de confusão simétrica (soma de A->B e B->A)
cm_symmetric_errors = cm_errors + cm_errors.T
np.fill_diagonal(cm_symmetric_errors, 0)
d1, d2 = np.unravel_index(np.argmax(cm_symmetric_errors), cm_symmetric_errors.shape)
total_par_erros = cm[d1, d2] + cm[d2, d1]

print(f"\n👉 Maior erro único de classificação: O modelo confundiu o dígito {origem} sendo previsto como {previsto} ({max_erros} vezes).")
print(f"👉 Par de dígitos mais confundidos entre si: {d1} e {d2} (Total de {total_par_erros} confusões recíprocas).")

# 4. Três imagens que ele errou, com previsão e rótulo verdadeiro
indices_erros = np.where(y_pred != y_te)[0]
print(f"\n👉 Total de imagens erradas no teste: {len(indices_erros)} de {len(y_te)}")

print("\n--- Três exemplos de erros cometidos pelo modelo ---")
for i, idx in enumerate(indices_erros[:3]):
    print(f"Exemplo {i+1}: Índice #{idx} | Rótulo Verdadeiro: {y_te[idx]} | Previsto pela CNN: {y_pred[idx]} (Probabilidade: {y_pred_probs[idx][y_pred[idx]]*100:.1f}%)")

# ==========================================
# PARTE 3 · Exportar para TensorFlow.js
# ==========================================
print("\n--- [Parte 3] Exportando Modelo para a Web ---")
os.makedirs("modelo_web", exist_ok=True)

try:
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(modelo, 'modelo_web')
    print("✅ Modelo exportado com sucesso para a pasta 'modelo_web/' usando tensorflowjs!")
except ImportError:
    print("⚠️ tensorflowjs não está instalado no ambiente Python atual.")
    print("Salvando modelo no formato Keras (.keras)...")
    modelo.save("modelo.keras")
    print("Para converter para a web, execute no terminal:")
    print("  pip install tensorflowjs")
    print("  tensorflowjs_converter --input_format=keras modelo.keras modelo_web/")
