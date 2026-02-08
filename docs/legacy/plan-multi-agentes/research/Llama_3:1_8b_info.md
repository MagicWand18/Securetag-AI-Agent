# Llama 3.1 8B info Ollama

## Model
### Metadata

general.architecture
llama
general.file_type
Q4_K_M
llama.attention.head_count
32
llama.attention.head_count_kv
8
llama.attention.layer_norm_rms_epsilon
1e-05
llama.block_count
32
llama.context_length
131072
llama.embedding_length
4096
llama.feed_forward_length
14336
llama.rope.dimension_count
128
llama.rope.freq_base
500000
llama.vocab_size
128256
tokenizer.ggml.bos_token_id
128000
tokenizer.ggml.eos_token_id
128009
tokenizer.ggml.merges
[Ġ Ġ, Ġ ĠĠĠ, ĠĠ ĠĠ, ĠĠĠ Ġ, i n, ...]
tokenizer.ggml.model
gpt2
tokenizer.ggml.pre
llama-bpe
tokenizer.ggml.token_type
[1, 1, 1, 1, 1, ...]
tokenizer.ggml.tokens
[!, ", #, $, %, ...]


### Tensor
Name
Type
Shape
token_embd.weight
Q4_K
[4096, 128256]
blk.0
blk.0.attn_k.weight
Q4_K
[4096, 1024]
blk.0.attn_norm.weight
F32
[4096]
blk.0.attn_output.weight
Q4_K
[4096, 4096]
blk.0.attn_q.weight
Q4_K
[4096, 4096]
blk.0.attn_v.weight
Q6_K
[4096, 1024]
blk.0.ffn_down.weight
Q6_K
[14336, 4096]
blk.0.ffn_gate.weight
Q4_K
[4096, 14336]
blk.0.ffn_norm.weight
F32
[4096]
blk.0.ffn_up.weight
Q4_K
[4096, 14336]

### blk.1 hasta blk.31
blk.1.attn_k.weight
Q4_K
[4096, 1024]
blk.1.attn_norm.weight
F32
[4096]
blk.1.attn_output.weight
Q4_K
[4096, 4096]
blk.1.attn_q.weight
Q4_K
[4096, 4096]
blk.1.attn_v.weight
Q6_K
[4096, 1024]
blk.1.ffn_down.weight
Q6_K
[14336, 4096]
blk.1.ffn_gate.weight
Q4_K
[4096, 14336]
blk.1.ffn_norm.weight
F32
[4096]
blk.1.ffn_up.weight
Q4_K
[4096, 14336]

## Params
{
    "stop": [
        "<|start_header_id|>",
        "<|end_header_id|>",
        "<|eot_id|>"
    ]
}

## Template
{{- if or .System .Tools }}<|start_header_id|>system<|end_header_id|>
{{- if .System }}

{{ .System }}
{{- end }}
{{- if .Tools }}

Cutting Knowledge Date: December 2023

When you receive a tool call response, use the output to format an answer to the orginal user question.

You are a helpful assistant with tool calling capabilities.
{{- end }}<|eot_id|>
{{- end }}
{{- range $i, $_ := .Messages }}
{{- $last := eq (len (slice $.Messages $i)) 1 }}
{{- if eq .Role "user" }}<|start_header_id|>user<|end_header_id|>
{{- if and $.Tools $last }}

Given the following functions, please respond with a JSON for a function call with its proper arguments that best answers the given prompt.

Respond in the format {"name": function name, "parameters": dictionary of argument name and its value}. Do not use variables.

{{ range $.Tools }}
{{- . }}
{{ end }}
Question: {{ .Content }}<|eot_id|>
{{- else }}

{{ .Content }}<|eot_id|>
{{- end }}{{ if $last }}<|start_header_id|>assistant<|end_header_id|>

{{ end }}
{{- else if eq .Role "assistant" }}<|start_header_id|>assistant<|end_header_id|>
{{- if .ToolCalls }}
{{ range .ToolCalls }}
{"name": "{{ .Function.Name }}", "parameters": {{ .Function.Arguments }}}{{ end }}
{{- else }}

{{ .Content }}
{{- end }}{{ if not $last }}<|eot_id|>{{ end }}
{{- else if eq .Role "tool" }}<|start_header_id|>ipython<|end_header_id|>

{{ .Content }}<|eot_id|>{{ if $last }}<|start_header_id|>assistant<|end_header_id|>

{{ end }}
{{- end }}
{{- end }}