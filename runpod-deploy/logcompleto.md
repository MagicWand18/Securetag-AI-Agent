# Request 1:

{
  "input": {
    "prompt": "Hello World"
  }
}


# Respuesta a request 1:
{
  "delayTime": 133288,
  "executionTime": 3291,
  "id": "410a2dd9-2ed4-4a2c-a6dc-9e8c6ec6692b-u2",
  "output": [
    {
      "choices": [
        {
          "finish_reason": "stop",
          "index": 0,
          "text": "Hola, está listo para responder cuestiones de ciberseguridad."
        }
      ],
      "created": 1764620935,
      "id": "cmpl-778",
      "model": "securetag-v1",
      "object": "text_completion",
      "system_fingerprint": "fp_ollama",
      "usage": {
        "completion_tokens": 17,
        "prompt_tokens": 199,
        "total_tokens": 216
      }
    }
  ],
  "status": "COMPLETED",
  "workerId": "he8g48laige0kt"
}


# Request 2:

{
  "input": {
    "prompt": "Que es un sql injection?"
  }
}


# Respuesta a request 2:

{
  "delayTime": 614,
  "executionTime": 4820,
  "id": "4b541030-9af0-44f6-9221-25e3c520641a-u1",
  "output": [
    {
      "choices": [
        {
          "finish_reason": "stop",
          "index": 0,
          "text": "**SQL Injection (SQLi)** es una vulnerabilidad de inyección de código que permite a un atacante manipular la sintaxis SQL enviada a la base de datos desde un aplicación. El objetivo es inyectar comandos SQL maliciosos para extraer, modificar o eliminar datos de la base de datos.\n\n**Causas y mecanismos:**\n\n1. **Inyección directa**: El usuario introduce literalmente una sentencia SQL en un parámetro de entrada (por ejemplo, `id`: 1 OR 1=1).\n2. **No parametrización adecuada**: La aplicación concatena los datos del usuario directamente en la consulta SQL sin usar placeholders de parameterización.\n3. **Falta de validación/normalización de entradas**: Los datos del usuario no se validan ni normalizan, permitiendo la inyección de caracteres speciales.\n\n**Ejemplos de payloads típicos:**\n\n- `1' OR 1=1 --` (injección de un commentario para sobreescribir la consulta original).\n- `' UNION SELECT '1'--` (uso de una cláusula UNION para ejecutar otra consulta).\n- `; DROP TABLE usuarios--` (uso del punto y coma para separar sentencias y borrar tablas).\n\n**Ventajas para el atacante:**\n\n- Extracción masiva de datos.\n- Modificación o eliminación de registros sin autorización.\n- Uso de la base de datos como plataforma para realizar acciones posteriores (por ejemplo, lanzar ataques de escalamiento de privilegios u otras vulnerabilidades).\n\n**Mitigaciones clave:**\n\n1. **Parameterización robusta** (usar parámetros con placeholders, no concatenación directa).\n2. **Validación/normalización estricta** de los datos del usuario.\n3. **Uso de consultas preparadas (PREPARE)** para limitar la inyección.\n4. **Límites de entrada y saneado de entradas para reducir vectores de inyección de caracteres especiales o payloads maliciosos."
        }
      ],
      "created": 1764621096,
      "id": "cmpl-780",
      "model": "securetag-v1",
      "object": "text_completion",
      "system_fingerprint": "fp_ollama",
      "usage": {
        "completion_tokens": 450,
        "prompt_tokens": 204,
        "total_tokens": 654
      }
    }
  ],
  "status": "COMPLETED",
  "workerId": "he8g48laige0kt"
}



# Log del servidor por ambos requests:

Usage:
 kill [options] <pid> [...]
Options:
 <pid> [...]            send signal to every <pid> listed
 -<signal>, -s, --signal <signal>
                        specify the <signal> to be sent
 -q, --queue <value>    integer value to be sent with the signal
Checking if server is running...
 -l, --list=[<signal>]  list all signal names, or convert one to a name
 -L, --table            list all signal names in a nice table
 -h, --help     display this help and exit
 -V, --version  output version information and exit
For more details see kill(1).
2025/12/01 20:28:45 routes.go:1259: INFO server config env="map[CUDA_VISIBLE_DEVICES: GPU_DEVICE_ORDINAL: HIP_VISIBLE_DEVICES: HSA_OVERRIDE_GFX_VERSION: HTTPS_PROXY: HTTP_PROXY: NO_PROXY: OLLAMA_DEBUG:false OLLAMA_FLASH_ATTENTION:false OLLAMA_GPU_OVERHEAD:0 OLLAMA_HOST:http://0.0.0.0:11434 OLLAMA_INTEL_GPU:false OLLAMA_KEEP_ALIVE:5m0s OLLAMA_KV_CACHE_TYPE: OLLAMA_LLM_LIBRARY: OLLAMA_LOAD_TIMEOUT:5m0s OLLAMA_MAX_LOADED_MODELS:0 OLLAMA_MAX_QUEUE:512 OLLAMA_MODELS:/runpod-volume OLLAMA_MULTIUSER_CACHE:false OLLAMA_NOHISTORY:false OLLAMA_NOPRUNE:false OLLAMA_NUM_PARALLEL:0 OLLAMA_ORIGINS:[http://localhost https://localhost http://localhost:* https://localhost:* http://127.0.0.1 https://127.0.0.1 http://127.0.0.1:* https://127.0.0.1:* http://0.0.0.0 https://0.0.0.0 http://0.0.0.0:* https://0.0.0.0:* app://* file://* tauri://* vscode-webview://*] OLLAMA_SCHED_SPREAD:false ROCR_VISIBLE_DEVICES: http_proxy: https_proxy: no_proxy:]"
time=2025-12-01T20:28:45.619Z level=INFO source=images.go:757 msg="total blobs: 10"
time=2025-12-01T20:28:45.619Z level=INFO source=images.go:764 msg="total unused blobs removed: 1"
[GIN-debug] [WARNING] Creating an Engine instance with the Logger and Recovery middleware already attached.
[GIN-debug] [WARNING] Running in "debug" mode. Switch to "release" mode in production.
 - using env:	export GIN_MODE=release
 - using code:	gin.SetMode(gin.ReleaseMode)
[GIN-debug] POST   /api/pull                 --> github.com/ollama/ollama/server.(*Server).PullHandler-fm (5 handlers)
[GIN-debug] POST   /api/generate             --> github.com/ollama/ollama/server.(*Server).GenerateHandler-fm (5 handlers)
[GIN-debug] POST   /api/chat                 --> github.com/ollama/ollama/server.(*Server).ChatHandler-fm (5 handlers)
[GIN-debug] POST   /api/embed                --> github.com/ollama/ollama/server.(*Server).EmbedHandler-fm (5 handlers)
[GIN-debug] POST   /api/embeddings           --> github.com/ollama/ollama/server.(*Server).EmbeddingsHandler-fm (5 handlers)
[GIN-debug] POST   /api/create               --> github.com/ollama/ollama/server.(*Server).CreateHandler-fm (5 handlers)
[GIN-debug] POST   /api/push                 --> github.com/ollama/ollama/server.(*Server).PushHandler-fm (5 handlers)
[GIN-debug] POST   /api/copy                 --> github.com/ollama/ollama/server.(*Server).CopyHandler-fm (5 handlers)
[GIN-debug] DELETE /api/delete               --> github.com/ollama/ollama/server.(*Server).DeleteHandler-fm (5 handlers)
[GIN-debug] POST   /api/show                 --> github.com/ollama/ollama/server.(*Server).ShowHandler-fm (5 handlers)
[GIN-debug] POST   /api/blobs/:digest        --> github.com/ollama/ollama/server.(*Server).CreateBlobHandler-fm (5 handlers)
[GIN-debug] HEAD   /api/blobs/:digest        --> github.com/ollama/ollama/server.(*Server).HeadBlobHandler-fm (5 handlers)
[GIN-debug] GET    /api/ps                   --> github.com/ollama/ollama/server.(*Server).PsHandler-fm (5 handlers)
[GIN-debug] POST   /v1/chat/completions      --> github.com/ollama/ollama/server.(*Server).ChatHandler-fm (6 handlers)
[GIN-debug] POST   /v1/completions           --> github.com/ollama/ollama/server.(*Server).GenerateHandler-fm (6 handlers)
[GIN-debug] POST   /v1/embeddings            --> github.com/ollama/ollama/server.(*Server).EmbedHandler-fm (6 handlers)
[GIN-debug] GET    /v1/models                --> github.com/ollama/ollama/server.(*Server).ListHandler-fm (6 handlers)
[GIN-debug] GET    /v1/models/:model         --> github.com/ollama/ollama/server.(*Server).ShowHandler-fm (6 handlers)
[GIN-debug] GET    /                         --> github.com/ollama/ollama/server.(*Server).GenerateRoutes.func1 (5 handlers)
[GIN-debug] GET    /api/tags                 --> github.com/ollama/ollama/server.(*Server).ListHandler-fm (5 handlers)
[GIN-debug] GET    /api/version              --> github.com/ollama/ollama/server.(*Server).GenerateRoutes.func2 (5 handlers)
[GIN-debug] HEAD   /                         --> github.com/ollama/ollama/server.(*Server).GenerateRoutes.func1 (5 handlers)
[GIN-debug] HEAD   /api/tags                 --> github.com/ollama/ollama/server.(*Server).ListHandler-fm (5 handlers)
[GIN-debug] HEAD   /api/version              --> github.com/ollama/ollama/server.(*Server).GenerateRoutes.func2 (5 handlers)
time=2025-12-01T20:28:45.620Z level=INFO source=routes.go:1310 msg="Listening on [::]:11434 (version 0.5.4-0-g2ddc32d-dirty)"
time=2025-12-01T20:28:45.620Z level=INFO source=routes.go:1339 msg="Dynamic LLM libraries" runners="[cuda_v11_avx cuda_v12_avx cpu cpu_avx cpu_avx2]"
time=2025-12-01T20:28:45.620Z level=INFO source=gpu.go:226 msg="looking for compatible GPUs"
time=2025-12-01T20:28:45.760Z level=INFO source=types.go:131 msg="inference compute" id=GPU-93e08bff-19ea-9448-3848-d2ab3d687e30 library=cuda variant=v12 compute=8.9 driver=12.4 name="NVIDIA GeForce RTX 4090" total="23.6 GiB" available="23.3 GiB"
Checking if server is running...
Pulling model securetag-v1...
[GIN] 2025/12/01 - 20:28:50 | 200 |      55.691µs |       127.0.0.1 | HEAD     "/"
[GIN] 2025/12/01 - 20:28:51 | 200 |  520.843679ms |       127.0.0.1 | POST     "/api/pull"
[?25lpulling manifest ⠙ [?25h[?25l[2K[1Gpulling manifest ⠙ [?25h[?25l[2K[1Gpulling manifest ⠹ [?25h[?25l[2K[1Gpulling manifest ⠼ [?25h[?25l[2K[1Gpulling manifest ⠼ [?25h[?25l[2K[1Gpulling manifest [?25h
Error: pull model manifest: file does not exist
--- Starting Serverless Worker |  Version 1.8.1 ---
{"requestId": null, "message": "Jobs in queue: 1", "level": "INFO"}
{"requestId": null, "message": "Jobs in progress: 1", "level": "INFO"}
Job: {'delayTime': 133477, 'id': '410a2dd9-2ed4-4a2c-a6dc-9e8c6ec6692b-u2', 'input': {'prompt': 'Hello World'}, 'status': 'IN_PROGRESS'}
OllamaEngine initialized
Generating response for job_input: <utils.JobInput object at 0x7413a00bc8d0>
OpenAI job: <utils.JobInput object at 0x7413a00bc9d0>
OllamaOpenAiEngine initialized
Generating response for job_input: <utils.JobInput object at 0x7413a00bc9d0>
time=2025-12-01T20:28:53.972Z level=INFO source=sched.go:714 msg="new model will fit in available VRAM in single GPU, loading" model=/runpod-volume/blobs/sha256-667b0c1932bc6ffc593ed1d03f895bf2dc8dc6df21db3042284a6f4416b06a29 gpu=GPU-93e08bff-19ea-9448-3848-d2ab3d687e30 parallel=4 available=24975835136 required="6.5 GiB"
time=2025-12-01T20:28:54.083Z level=INFO source=server.go:104 msg="system memory" total="251.5 GiB" free="230.4 GiB" free_swap="0 B"
time=2025-12-01T20:28:54.084Z level=INFO source=memory.go:356 msg="offload to cuda" layers.requested=-1 layers.model=33 layers.offload=33 layers.split="" memory.available="[23.3 GiB]" memory.gpu_overhead="0 B" memory.required.full="6.5 GiB" memory.required.partial="6.5 GiB" memory.required.kv="1.0 GiB" memory.required.allocations="[6.5 GiB]" memory.weights.total="4.9 GiB" memory.weights.repeating="4.5 GiB" memory.weights.nonrepeating="411.0 MiB" memory.graph.full="560.0 MiB" memory.graph.partial="677.5 MiB"
time=2025-12-01T20:28:54.084Z level=INFO source=server.go:376 msg="starting llama server" cmd="/usr/lib/ollama/runners/cuda_v12_avx/ollama_llama_server runner --model /runpod-volume/blobs/sha256-667b0c1932bc6ffc593ed1d03f895bf2dc8dc6df21db3042284a6f4416b06a29 --ctx-size 8192 --batch-size 512 --n-gpu-layers 33 --lora /runpod-volume/blobs/sha256-27152a06f8a83c9b950a1c0e85c9cfc1ef8e52c9da9e1df6cd0dfa38184819c8 --threads 24 --parallel 4 --port 46753"
time=2025-12-01T20:28:54.085Z level=INFO source=sched.go:449 msg="loaded runners" count=1
time=2025-12-01T20:28:54.085Z level=INFO source=server.go:555 msg="waiting for llama runner to start responding"
time=2025-12-01T20:28:54.085Z level=INFO source=server.go:589 msg="waiting for server to become available" status="llm server error"
time=2025-12-01T20:28:54.128Z level=INFO source=runner.go:945 msg="starting go runner"
ggml_cuda_init: GGML_CUDA_FORCE_MMQ:    no
ggml_cuda_init: GGML_CUDA_FORCE_CUBLAS: no
ggml_cuda_init: found 1 CUDA devices:
Device 0: NVIDIA GeForce RTX 4090, compute capability 8.9, VMM: yes
time=2025-12-01T20:28:54.136Z level=INFO source=runner.go:946 msg=system info="CUDA : ARCHS = 600,610,620,700,720,750,800,860,870,890,900 | USE_GRAPHS = 1 | PEER_MAX_BATCH_SIZE = 128 | CPU : SSE3 = 1 | SSSE3 = 1 | AVX = 1 | LLAMAFILE = 1 | AARCH64_REPACK = 1 | cgo(gcc)" threads=24
time=2025-12-01T20:28:54.136Z level=INFO source=.:0 msg="Server listening on 127.0.0.1:46753"
llama_load_model_from_file: using device CUDA0 (NVIDIA GeForce RTX 4090) - 23818 MiB free
llama_model_loader: loaded meta data with 29 key-value pairs and 292 tensors from /runpod-volume/blobs/sha256-667b0c1932bc6ffc593ed1d03f895bf2dc8dc6df21db3042284a6f4416b06a29 (version GGUF V3 (latest))
llama_model_loader: Dumping metadata keys/values. Note: KV overrides do not apply in this output.
llama_model_loader: - kv   0:                       general.architecture str              = llama
llama_model_loader: - kv   1:                               general.type str              = model
llama_model_loader: - kv   2:                               general.name str              = Meta Llama 3.1 8B Instruct
llama_model_loader: - kv   3:                           general.finetune str              = Instruct
llama_model_loader: - kv   4:                           general.basename str              = Meta-Llama-3.1
llama_model_loader: - kv   5:                         general.size_label str              = 8B
llama_model_loader: - kv   6:                            general.license str              = llama3.1
llama_model_loader: - kv   7:                               general.tags arr[str,6]       = ["facebook", "meta", "pytorch", "llam...
llama_model_loader: - kv   8:                          general.languages arr[str,8]       = ["en", "de", "fr", "it", "pt", "hi", ...
llama_model_loader: - kv   9:                          llama.block_count u32              = 32
llama_model_loader: - kv  10:                       llama.context_length u32              = 131072
llama_model_loader: - kv  11:                     llama.embedding_length u32              = 4096
llama_model_loader: - kv  12:                  llama.feed_forward_length u32              = 14336
llama_model_loader: - kv  13:                 llama.attention.head_count u32              = 32
llama_model_loader: - kv  14:              llama.attention.head_count_kv u32              = 8
llama_model_loader: - kv  15:                       llama.rope.freq_base f32              = 500000.000000
llama_model_loader: - kv  16:     llama.attention.layer_norm_rms_epsilon f32              = 0.000010
llama_model_loader: - kv  17:                          general.file_type u32              = 15
llama_model_loader: - kv  18:                           llama.vocab_size u32              = 128256
llama_model_loader: - kv  19:                 llama.rope.dimension_count u32              = 128
llama_model_loader: - kv  20:                       tokenizer.ggml.model str              = gpt2
llama_model_loader: - kv  21:                         tokenizer.ggml.pre str              = llama-bpe
llama_model_loader: - kv  22:                      tokenizer.ggml.tokens arr[str,128256]  = ["!", "\"", "#", "$", "%", "&", "'", ...
llama_model_loader: - kv  23:                  tokenizer.ggml.token_type arr[i32,128256]  = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, ...
llama_model_loader: - kv  24:                      tokenizer.ggml.merges arr[str,280147]  = ["Ġ Ġ", "Ġ ĠĠĠ", "ĠĠ ĠĠ", "...
llama_model_loader: - kv  25:                tokenizer.ggml.bos_token_id u32              = 128000
llama_model_loader: - kv  26:                tokenizer.ggml.eos_token_id u32              = 128009
llama_model_loader: - kv  27:                    tokenizer.chat_template str              = {{- bos_token }}\n{%- if custom_tools ...
llama_model_loader: - kv  28:               general.quantization_version u32              = 2
llama_model_loader: - type  f32:   66 tensors
llama_model_loader: - type q4_K:  193 tensors
llama_model_loader: - type q6_K:   33 tensors
time=2025-12-01T20:28:54.337Z level=INFO source=server.go:589 msg="waiting for server to become available" status="llm server loading model"
llm_load_vocab: special tokens cache size = 256
llm_load_vocab: token to piece cache size = 0.7999 MB
llm_load_print_meta: format           = GGUF V3 (latest)
llm_load_print_meta: arch             = llama
llm_load_print_meta: vocab type       = BPE
llm_load_print_meta: n_vocab          = 128256
llm_load_print_meta: n_merges         = 280147
llm_load_print_meta: vocab_only       = 0
llm_load_print_meta: n_ctx_train      = 131072
llm_load_print_meta: n_embd           = 4096
llm_load_print_meta: n_layer          = 32
llm_load_print_meta: n_head           = 32
llm_load_print_meta: n_head_kv        = 8
llm_load_print_meta: n_rot            = 128
llm_load_print_meta: n_swa            = 0
llm_load_print_meta: n_embd_head_k    = 128
llm_load_print_meta: n_embd_head_v    = 128
llm_load_print_meta: n_gqa            = 4
llm_load_print_meta: n_embd_k_gqa     = 1024
llm_load_print_meta: n_embd_v_gqa     = 1024
llm_load_print_meta: f_norm_eps       = 0.0e+00
llm_load_print_meta: f_norm_rms_eps   = 1.0e-05
llm_load_print_meta: f_clamp_kqv      = 0.0e+00
llm_load_print_meta: f_max_alibi_bias = 0.0e+00
llm_load_print_meta: f_logit_scale    = 0.0e+00
llm_load_print_meta: n_ff             = 14336
llm_load_print_meta: n_expert         = 0
llm_load_print_meta: n_expert_used    = 0
llm_load_print_meta: causal attn      = 1
llm_load_print_meta: pooling type     = 0
llm_load_print_meta: rope type        = 0
llm_load_print_meta: rope scaling     = linear
llm_load_print_meta: freq_base_train  = 500000.0
llm_load_print_meta: freq_scale_train = 1
llm_load_print_meta: n_ctx_orig_yarn  = 131072
llm_load_print_meta: rope_finetuned   = unknown
llm_load_print_meta: ssm_d_conv       = 0
llm_load_print_meta: ssm_d_inner      = 0
llm_load_print_meta: ssm_d_state      = 0
llm_load_print_meta: ssm_dt_rank      = 0
llm_load_print_meta: ssm_dt_b_c_rms   = 0
llm_load_print_meta: model type       = 8B
llm_load_print_meta: model ftype      = Q4_K - Medium
llm_load_print_meta: model params     = 8.03 B
llm_load_print_meta: model size       = 4.58 GiB (4.89 BPW)
llm_load_print_meta: general.name     = Meta Llama 3.1 8B Instruct
llm_load_print_meta: BOS token        = 128000 '<|begin_of_text|>'
llm_load_print_meta: EOS token        = 128009 '<|eot_id|>'
llm_load_print_meta: EOT token        = 128009 '<|eot_id|>'
llm_load_print_meta: EOM token        = 128008 '<|eom_id|>'
llm_load_print_meta: LF token         = 128 'Ä'
llm_load_print_meta: EOG token        = 128008 '<|eom_id|>'
llm_load_print_meta: EOG token        = 128009 '<|eot_id|>'
llm_load_print_meta: max token length = 256
llm_load_tensors: offloading 32 repeating layers to GPU
llm_load_tensors: offloading output layer to GPU
llm_load_tensors: offloaded 33/33 layers to GPU
llm_load_tensors:          CPU model buffer size =   281.81 MiB
llm_load_tensors:        CUDA0 model buffer size =  4403.49 MiB
llama_new_context_with_model: n_seq_max     = 4
llama_new_context_with_model: n_ctx         = 8192
llama_new_context_with_model: n_ctx_per_seq = 2048
llama_new_context_with_model: n_batch       = 2048
llama_new_context_with_model: n_ubatch      = 512
llama_new_context_with_model: flash_attn    = 0
llama_new_context_with_model: freq_base     = 500000.0
llama_new_context_with_model: freq_scale    = 1
llama_new_context_with_model: n_ctx_per_seq (2048) < n_ctx_train (131072) -- the full capacity of the model will not be utilized
llama_kv_cache_init:      CUDA0 KV buffer size =  1024.00 MiB
llama_new_context_with_model: KV self size  = 1024.00 MiB, K (f16):  512.00 MiB, V (f16):  512.00 MiB
llama_new_context_with_model:  CUDA_Host  output buffer size =     2.02 MiB
llama_new_context_with_model:      CUDA0 compute buffer size =   560.00 MiB
llama_new_context_with_model:  CUDA_Host compute buffer size =    24.01 MiB
llama_new_context_with_model: graph nodes  = 1030
llama_new_context_with_model: graph splits = 2
llama_lora_adapter_init_internal: loading lora adapter from '/runpod-volume/blobs/sha256-27152a06f8a83c9b950a1c0e85c9cfc1ef8e52c9da9e1df6cd0dfa38184819c8' ...
llama_lora_adapter_init_internal:      CUDA0 LoRA buffer size =   160.00 MiB
llama_lora_adapter_init_internal: loaded 448 tensors from lora file
time=2025-12-01T20:28:55.592Z level=INFO source=server.go:594 msg="llama runner started in 1.51 seconds"
llama_model_loader: loaded meta data with 29 key-value pairs and 292 tensors from /runpod-volume/blobs/sha256-667b0c1932bc6ffc593ed1d03f895bf2dc8dc6df21db3042284a6f4416b06a29 (version GGUF V3 (latest))
llama_model_loader: Dumping metadata keys/values. Note: KV overrides do not apply in this output.
llama_model_loader: - kv   0:                       general.architecture str              = llama
llama_model_loader: - kv   1:                               general.type str              = model
llama_model_loader: - kv   2:                               general.name str              = Meta Llama 3.1 8B Instruct
llama_model_loader: - kv   3:                           general.finetune str              = Instruct
llama_model_loader: - kv   4:                           general.basename str              = Meta-Llama-3.1
llama_model_loader: - kv   5:                         general.size_label str              = 8B
llama_model_loader: - kv   6:                            general.license str              = llama3.1
llama_model_loader: - kv   7:                               general.tags arr[str,6]       = ["facebook", "meta", "pytorch", "llam...
llama_model_loader: - kv   8:                          general.languages arr[str,8]       = ["en", "de", "fr", "it", "pt", "hi", ...
llama_model_loader: - kv   9:                          llama.block_count u32              = 32
llama_model_loader: - kv  10:                       llama.context_length u32              = 131072
llama_model_loader: - kv  11:                     llama.embedding_length u32              = 4096
llama_model_loader: - kv  12:                  llama.feed_forward_length u32              = 14336
llama_model_loader: - kv  13:                 llama.attention.head_count u32              = 32
llama_model_loader: - kv  14:              llama.attention.head_count_kv u32              = 8
llama_model_loader: - kv  15:                       llama.rope.freq_base f32              = 500000.000000
llama_model_loader: - kv  16:     llama.attention.layer_norm_rms_epsilon f32              = 0.000010
llama_model_loader: - kv  17:                          general.file_type u32              = 15
llama_model_loader: - kv  18:                           llama.vocab_size u32              = 128256
llama_model_loader: - kv  19:                 llama.rope.dimension_count u32              = 128
llama_model_loader: - kv  20:                       tokenizer.ggml.model str              = gpt2
llama_model_loader: - kv  21:                         tokenizer.ggml.pre str              = llama-bpe
llama_model_loader: - kv  22:                      tokenizer.ggml.tokens arr[str,128256]  = ["!", "\"", "#", "$", "%", "&", "'", ...
llama_model_loader: - kv  23:                  tokenizer.ggml.token_type arr[i32,128256]  = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, ...
llama_model_loader: - kv  24:                      tokenizer.ggml.merges arr[str,280147]  = ["Ġ Ġ", "Ġ ĠĠĠ", "ĠĠ ĠĠ", "...
llama_model_loader: - kv  25:                tokenizer.ggml.bos_token_id u32              = 128000
llama_model_loader: - kv  26:                tokenizer.ggml.eos_token_id u32              = 128009
llama_model_loader: - kv  27:                    tokenizer.chat_template str              = {{- bos_token }}\n{%- if custom_tools ...
llama_model_loader: - kv  28:               general.quantization_version u32              = 2
llama_model_loader: - type  f32:   66 tensors
llama_model_loader: - type q4_K:  193 tensors
llama_model_loader: - type q6_K:   33 tensors
llm_load_vocab: special tokens cache size = 256
llm_load_vocab: token to piece cache size = 0.7999 MB
llm_load_print_meta: format           = GGUF V3 (latest)
llm_load_print_meta: arch             = llama
llm_load_print_meta: vocab type       = BPE
llm_load_print_meta: n_vocab          = 128256
llm_load_print_meta: n_merges         = 280147
llm_load_print_meta: vocab_only       = 1
llm_load_print_meta: model type       = ?B
llm_load_print_meta: model ftype      = all F32
llm_load_print_meta: model params     = 8.03 B
llm_load_print_meta: model size       = 4.58 GiB (4.89 BPW)
llm_load_print_meta: general.name     = Meta Llama 3.1 8B Instruct
llm_load_print_meta: BOS token        = 128000 '<|begin_of_text|>'
llm_load_print_meta: EOS token        = 128009 '<|eot_id|>'
llm_load_print_meta: EOT token        = 128009 '<|eot_id|>'
llm_load_print_meta: EOM token        = 128008 '<|eom_id|>'
llm_load_print_meta: LF token         = 128 'Ä'
llm_load_print_meta: EOG token        = 128008 '<|eom_id|>'
llm_load_print_meta: EOG token        = 128009 '<|eot_id|>'
llm_load_print_meta: max token length = 256
llama_model_load: vocab only - skipping tensors
[GIN] 2025/12/01 - 20:28:56 | 200 |  2.723876593s |             ::1 | POST     "/v1/completions"
_client.py          :1025 2025-12-01 20:28:56,503 HTTP Request: POST http://localhost:11434/v1/completions "HTTP/1.1 200 OK"
{"requestId": "410a2dd9-2ed4-4a2c-a6dc-9e8c6ec6692b-u2", "message": "Finished running generator.", "level": "INFO"}
{"requestId": "410a2dd9-2ed4-4a2c-a6dc-9e8c6ec6692b-u2", "message": "Finished.", "level": "INFO"}
{"requestId": null, "message": "Jobs in queue: 1", "level": "INFO"}
{"requestId": null, "message": "Jobs in progress: 1", "level": "INFO"}
Job: {'delayTime': 795, 'id': '4b541030-9af0-44f6-9221-25e3c520641a-u1', 'input': {'prompt': 'Que es un sqlinjection?'}, 'status': 'IN_PROGRESS'}
OllamaEngine initialized
Generating response for job_input: <utils.JobInput object at 0x74139ecf32d0>
OpenAI job: <utils.JobInput object at 0x7413a00b3410>
OllamaOpenAiEngine initialized
Generating response for job_input: <utils.JobInput object at 0x7413a00b3410>
[GIN] 2025/12/01 - 20:31:36 | 200 |  4.441154002s |             ::1 | POST     "/v1/completions"
_client.py          :1025 2025-12-01 20:31:36,669 HTTP Request: POST http://localhost:11434/v1/completions "HTTP/1.1 200 OK"
{"requestId": "4b541030-9af0-44f6-9221-25e3c520641a-u1", "message": "Finished running generator.", "level": "INFO"}
{"requestId": "4b541030-9af0-44f6-9221-25e3c520641a-u1", "message": "Finished.", "level": "INFO"}
