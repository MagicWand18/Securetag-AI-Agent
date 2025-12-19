import argparse
import json
import os
import random
import subprocess
import time
import urllib.request
import urllib.error
from datetime import datetime
from glob import glob

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(SCRIPT_DIR, "results")
DATASETS_DIR = os.path.join(os.path.dirname(os.path.dirname(SCRIPT_DIR)), "datasets/qa_generated")
ENV_FILE = os.path.join(SCRIPT_DIR, ".env")

def load_env():
    """Loads environment variables from .env file."""
    env_vars = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
    return env_vars

def get_ollama_models():
    """Retrieves a list of available Ollama models."""
    try:
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True, check=True)
        lines = result.stdout.strip().split('\n')
        # Skip header line
        models = [line.split()[0] for line in lines[1:] if line.strip()]
        return models
    except subprocess.CalledProcessError as e:
        print(f"Error listing Ollama models: {e}")
        return []

def load_qa_files(filter_files=None):
    """Loads Q&A files from the dataset directory."""
    all_files = glob(os.path.join(DATASETS_DIR, "*.json"))
    if filter_files:
        filtered = []
        for f in all_files:
            if any(filter_str in os.path.basename(f) for filter_str in filter_files):
                filtered.append(f)
        return filtered
    return all_files

def select_questions(qa_files):
    """Selects one random question from each Q&A file."""
    questions = []
    for file_path in qa_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                if isinstance(data, list) and data:
                    item = random.choice(data)
                    
                    question = ""
                    if "question" in item:
                        question = item["question"]
                    elif "instruction" in item:
                        question = item["instruction"]
                    elif "prompt" in item:
                        question = item["prompt"]
                    
                    if question:
                        questions.append({
                            "source": os.path.basename(file_path),
                            "question": question
                        })
        except json.JSONDecodeError:
            print(f"Error decoding JSON from {file_path}")
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
    return questions

def query_ollama(model, prompt):
    """Queries an Ollama model."""
    try:
        start_time = time.time()
        result = subprocess.run(
            ['ollama', 'run', model, prompt],
            capture_output=True,
            text=True,
            check=True
        )
        duration = time.time() - start_time
        return {
            "response": result.stdout.strip(),
            "duration": round(duration, 2),
            "error": None
        }
    except subprocess.CalledProcessError as e:
        return {
            "response": "",
            "duration": 0,
            "error": str(e.stderr)
        }

def audit_with_chatgpt(api_key, question, model_responses):
    """Sends responses to ChatGPT for auditing using urllib."""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    prompt_content = f"""
    Actúa como un Auditor Experto en Ciberseguridad. Evalúa las siguientes respuestas a la pregunta: "{question}"
    
    Criterios de evaluación:
    1. Precisión: ¿La información técnica es correcta?
    2. Completitud: ¿Responde completamente a la pregunta?
    3. Relevancia: ¿Es específica al contexto de ciberseguridad?
    4. Claridad: ¿Es fácil de entender?
    
    Modelos y sus respuestas:
    """
    
    for model, data in model_responses.items():
        prompt_content += f"\n--- Modelo: {model} ---\nRespuesta: {data['response']}\n"
        
    prompt_content += """
    
    Proporciona una respuesta en formato JSON con la siguiente estructura:
    {
        "winner": "Nombre del mejor modelo",
        "reasoning": "Explicación detallada de por qué ganó y por qué los demás perdieron"
    }
    """

    payload = {
        "model": "gpt-5.1",
        "messages": [
            {"role": "system", "content": "Eres un auditor experto y estricto en ciberseguridad. Respondes siempre en español."},
            {"role": "user", "content": prompt_content}
        ],
        "response_format": {"type": "json_object"}
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
        with urllib.request.urlopen(req) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            return response_data['choices'][0]['message']['content']
    except urllib.error.HTTPError as e:
        print(f"HTTP Error querying ChatGPT: {e.code} - {e.reason}")
        return None
    except Exception as e:
        print(f"Error querying ChatGPT: {e}")
        return None

def generate_report(results, filepath=None, append=False):
    """Generates a Markdown report."""
    if filepath is None:
        timestamp = datetime.now().strftime("%d-%m-%y__%H-%M-%S")
        filename = f"test_{len(glob(os.path.join(RESULTS_DIR, 'test_*.md'))) + 1}_{timestamp}.md"
        filepath = os.path.join(RESULTS_DIR, filename)
    
    mode = 'a' if append else 'w'
    with open(filepath, mode) as f:
        if not append:
            f.write(f"# Reporte de Evaluación de Modelos - {datetime.now().strftime('%d-%m-%y__%H-%M-%S')}\n\n")
        
        for res in results:
            try:
                audit = json.loads(res['audit'])
            except json.JSONDecodeError:
                f.write(f"## Error parsing audit JSON\nRaw: {res['audit']}\n\n")
                continue

            f.write(f"## Pregunta: {res['question']['question']}\n")
            f.write(f"**Fuente:** {res['question']['source']}\n\n")
            
            f.write(f"### 🏆 Veredicto ChatGPT: Ganador - {audit.get('winner', 'N/A')}\n")
            f.write(f"**Razón:** {audit.get('reasoning', 'N/A')}\n\n")
            
            f.write("### Respuestas de los Modelos\n")
            for model, data in res['responses'].items():
                f.write(f"#### {model} ({data['duration']}s)\n")
                f.write(f"{data['response']}\n\n")
            
            f.write("---\n\n")
    
    return filepath

def main():
    parser = argparse.ArgumentParser(description="Evaluate Ollama models with ChatGPT auditing.")
    parser.add_argument("--models", nargs='+', help="List of models to evaluate (default: all)")
    parser.add_argument("--files", nargs='+', help="List of Q&A files to use (partial match)")
    args = parser.parse_args()

    env = load_env()
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found in .env")
        return

    # 1. Get Models
    available_models = get_ollama_models()
    selected_models = args.models if args.models else available_models
    
    # Validate models
    valid_models = []
    for m in selected_models:
        if m in available_models:
            valid_models.append(m)
        elif f"{m}:latest" in available_models:
            valid_models.append(f"{m}:latest")
        else:
            # Try to find a match that starts with the name
            matches = [am for am in available_models if am.startswith(m)]
            if matches:
                valid_models.append(matches[0])

    # Remove duplicates
    valid_models = list(set(valid_models))

    if len(valid_models) < 2:
        print(f"Error: Need at least 2 valid models to compare. Found: {valid_models}")
        print(f"Available models: {available_models}")
        return

    print(f"Selected Models: {valid_models}")

    # 2. Get Q&A Files
    qa_files = load_qa_files(args.files)
    if not qa_files:
        print("Error: No Q&A files found matching criteria.")
        return
    
    print(f"Selected Files: {[os.path.basename(f) for f in qa_files]}")

    # 3. Select Questions
    questions = select_questions(qa_files)
    if not questions:
        print("Error: Could not extract questions from files.")
        return

    print(f"Selected {len(questions)} questions.")

    # 4. Evaluate
    results = []
    report_filepath = None
    
    for idx, q in enumerate(questions, 1):
        print(f"\n[{idx}/{len(questions)}] Evaluating Question: {q['question'][:60]}...")
        model_responses = {}
        
        for model in valid_models:
            print(f"  Querying {model}...", end="", flush=True)
            resp = query_ollama(model, q['question'])
            model_responses[model] = resp
            print(f" Done ({resp['duration']}s)")
        
        print("  Auditing with ChatGPT...", end="", flush=True)
        audit_json = audit_with_chatgpt(api_key, q['question'], model_responses)
        if audit_json:
            print(" Done.")
            result = {
                "question": q,
                "responses": model_responses,
                "audit": audit_json
            }
            results.append(result)
            
            # Write result immediately to file
            report_filepath = generate_report([result], filepath=report_filepath, append=(idx > 1))
            
            # Show result in terminal
            try:
                audit = json.loads(audit_json)
                winner = audit.get('winner', 'N/A')
                print(f"  ✅ Winner: {winner}")
            except:
                print(f"  ⚠️ Could not parse audit result")
        else:
            print(" Failed.")

    # 5. Final summary
    if results:
        print(f"\n{'='*60}")
        print(f"Evaluación completada: {len(results)} preguntas")
        print(f"Reporte generado: {report_filepath}")
        print(f"{'='*60}")
    else:
        print("No results to report.")

if __name__ == "__main__":
    main()

