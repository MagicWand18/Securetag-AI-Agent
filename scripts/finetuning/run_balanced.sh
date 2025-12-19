#!/bin/bash
# Script para ejecutar 3 workers con asignación balanceada - PENDIENTES
# Generado automáticamente

echo "🚀 Iniciando 3 workers con asignación balanceada (solo pendientes)..."
echo ""

mkdir -p logs

# Worker 0: 7,382 chunks
echo "Iniciando Worker 0 (7,382 chunks)..."
nohup python3 scripts/finetuning/generate_qa.py --files "markdown_hacktricks_chunks.json:0-3643,yml_sigma_main_chunks.json" > logs/worker_0.log 2>&1 &
sleep 2

# Worker 1: 5,947 chunks
echo "Iniciando Worker 1 (5,947 chunks)..."
nohup python3 scripts/finetuning/generate_qa.py --files "markdown_hacktricks_chunks.json:3643-7286,json_cisa_kev_chunks.json,pdf_cis_controls_v8.1_chunks.json,json_d3fend_chunks.json,pdf_nist_csf_2.0_chunks.json,yml_sigma_threat_hunting_chunks.json" > logs/worker_1.log 2>&1 &
sleep 2

# Worker 2: 5,826 chunks
echo "Iniciando Worker 2 (5,826 chunks)..."
nohup python3 scripts/finetuning/generate_qa.py --files "markdown_hacktricks_chunks.json:7286-10930,xml_capec_chunks.json,html_ptes_chunks.json,yml_sigma_emerging_threats_chunks.json,yml_mitre_car_chunks.json,yml_sigma_placeholder_chunks.json,html_owasp_api_top10_chunks.json,html_sans_top25_chunks.json,yml_sigma_compliance_chunks.json" > logs/worker_2.log 2>&1 &
sleep 2

echo ""
echo "✅ 3 workers iniciados con asignación balanceada"
echo ""
echo "Distribución de carga:"
echo "  Worker 0: 7,382 chunks"
echo "  Worker 1: 5,947 chunks"
echo "  Worker 2: 5,826 chunks"
echo ""
echo "Diferencia máxima: 1,556 chunks (24.4%)"
echo ""
echo "Para monitorear el progreso:"
echo "  tail -f logs/worker_0.log"
echo "  tail -f logs/worker_1.log"
echo "  tail -f logs/worker_2.log"
echo ""
echo "Para detener todos los workers:"
echo "  pkill -f 'generate_qa.py'"
