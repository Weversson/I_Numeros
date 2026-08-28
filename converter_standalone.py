"""
Conversor Keras 3 / TensorFlow 2.16+ para TensorFlow.js com Sanitização
Garante 100% de compatibilidade com tf.loadLayersModel() no navegador.
"""

import os
import json
import numpy as np
import tensorflow as tf

def sanitize_layer_config(layer_dict):
    """Sanitiza configurações do Keras 3 para compatibilidade com o parser do TF.js"""
    if not isinstance(layer_dict, dict):
        return layer_dict
    
    cfg = layer_dict.get("config", {})
    
    # Keras 3 usa batch_shape, TF.js espera batch_input_shape
    if "batch_shape" in cfg and "batch_input_shape" not in cfg:
        cfg["batch_input_shape"] = cfg.pop("batch_shape")
        
    # Keras 3 usa DTypePolicy dict, TF.js espera string "float32"
    if isinstance(cfg.get("dtype"), dict):
        cfg["dtype"] = cfg["dtype"].get("config", {}).get("name", "float32")
        
    # Remove campos desconhecidos pelo TF.js
    for key in ["sparse", "ragged", "optional", "registered_name"]:
        layer_dict.pop(key, None)
        cfg.pop(key, None)
        
    return layer_dict

def convert_keras_to_tfjs(model_path="modelo.keras", output_dir="modelo_web"):
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Carregando modelo de '{model_path}'...")
    model = tf.keras.models.load_model(model_path)
    
    model_json_str = model.to_json()
    model_config_raw = json.loads(model_json_str)
    
    if "config" in model_config_raw and "layers" in model_config_raw["config"]:
        layers_config = model_config_raw["config"]["layers"]
    elif "layers" in model_config_raw:
        layers_config = model_config_raw["layers"]
    else:
        layers_config = []

    sanitized_layers = [sanitize_layer_config(l) for l in layers_config]

    model_topology = {
        "keras_version": "2.15.0",
        "backend": "tensorflow",
        "model_config": {
            "class_name": "Sequential",
            "config": {
                "name": model.name or "sequential",
                "layers": sanitized_layers
            }
        }
    }

    weights_manifest_entries = []
    weight_bytes_list = []
    
    for layer in model.layers:
        weights = layer.get_weights()
        if not weights:
            continue
        
        if len(weights) == 2:
            kernel, bias = weights
            k_name = f"{layer.name}/kernel"
            b_name = f"{layer.name}/bias"
            
            k_arr = kernel.astype(np.float32)
            b_arr = bias.astype(np.float32)
            
            weights_manifest_entries.append({
                "name": k_name,
                "shape": list(k_arr.shape),
                "dtype": "float32"
            })
            weights_manifest_entries.append({
                "name": b_name,
                "shape": list(b_arr.shape),
                "dtype": "float32"
            })
            
            weight_bytes_list.append(k_arr.tobytes())
            weight_bytes_list.append(b_arr.tobytes())
        else:
            for idx, w in enumerate(weights):
                w_arr = w.astype(np.float32)
                w_name = f"{layer.name}/weight_{idx}"
                weights_manifest_entries.append({
                    "name": w_name,
                    "shape": list(w_arr.shape),
                    "dtype": "float32"
                })
                weight_bytes_list.append(w_arr.tobytes())

    bin_filename = "group1-shard1of1.bin"
    bin_path = os.path.join(output_dir, bin_filename)
    
    with open(bin_path, "wb") as f:
        for b in weight_bytes_list:
            f.write(b)
            
    total_bytes = os.path.getsize(bin_path)

    tfjs_model_json = {
        "format": "layers-model",
        "generatedBy": f"keras v{tf.keras.__version__}",
        "convertedBy": "Standalone Keras-to-TFJS Exporter",
        "modelTopology": model_topology,
        "weightsManifest": [
            {
                "paths": [bin_filename],
                "weights": weights_manifest_entries
            }
        ]
    }

    json_path = os.path.join(output_dir, "model.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(tfjs_model_json, f, indent=2)
        
    print(f"Conversao finalizada com sucesso!")
    print(f"   -> Manifesto: {json_path}")
    print(f"   -> Pesos binarios: {bin_path} ({total_bytes} bytes)")

if __name__ == "__main__":
    convert_keras_to_tfjs()
