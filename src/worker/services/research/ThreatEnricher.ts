import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CVE } from './ThreatMonitor';

// Configuración de Directorios
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '../../../../');
const TEMP_DIR = path.join(BASE_DIR, 'scripts/research/temp');
const ENRICHED_FILE = path.join(TEMP_DIR, 'trending_cves_enriched.json');

// Estructura enriquecida
export interface EnrichedCVE extends CVE {
  epss?: number;
  cwe_id?: string;
  references?: string[];
  exploit_snippet?: string;
  ai_context?: string;
  nvd_references?: string[]; // Asegurar que coincida con ThreatMonitor
}

export class ThreatEnricher {
  
  /**
   * Obtiene el score EPSS (Exploit Prediction Scoring System) desde FIRST.org
   */
  private async getEpssScore(cveId: string): Promise<number> {
    const url = `https://api.first.org/data/v1/epss?cve=${cveId}`;
    try {
      const response = await axios.get(url, { timeout: 10000 });
      if (response.status === 200 && response.data.data && response.data.data.length > 0) {
        const score = parseFloat(response.data.data[0].epss || "0.0");
        // console.log(`      ✅ EPSS Score for ${cveId}: ${score}`);
        return score;
      }
    } catch (error: any) {
      console.warn(`⚠️ Error fetching EPSS for ${cveId}: ${error.message}`);
    }
    return 0.0;
  }

  /**
   * Realiza scraping a CVEDetails para obtener CWE y referencias externas
   */
  private async getCveDetailsInfo(cveId: string): Promise<{ cwe_id: string; external_refs: string[] }> {
    const url = `https://www.cvedetails.com/cve/${cveId}/`;
    const result = { cwe_id: "Unknown", external_refs: [] as string[] };
    
    // console.log(`   🔎 Scraping CVEDetails for ${cveId}...`);

    try {
      const response = await axios.get(url, {
        headers: {
          // User-Agent de MacOS (como en el script Python que funcionaba)
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        timeout: 15000
      });

      if (response.status === 200) {
        const $ = cheerio.load(response.data);

        // 1. Extraer CWE ID
        const cweLink = $('a[href*="cwe_details"]');
        if (cweLink.length) {
          result.cwe_id = cweLink.text().trim();
        }

        // 2. Extraer referencias de exploits
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            const lowerHref = href.toLowerCase();
            if (["github.com", "exploit-db.com", "packetstormsecurity.com", "rapid7.com"].some(d => lowerHref.includes(d))) {
              result.external_refs.push(href);
            }
          }
        });
        
        // Deduplicar y limitar
        result.external_refs = Array.from(new Set(result.external_refs)).slice(0, 10);
        
        // Debug Log si encontró algo
        if (result.external_refs.length > 0) {
          console.log(`      ✅ Found ${result.external_refs.length} potential exploit refs for ${cveId}`);
        }
      }
    } catch (error: any) {
      // 404 es común para CVEs muy nuevos, 403 es bloqueo
      const status = error.response ? error.response.status : 'Unknown';
      console.warn(`⚠️ Error scraping CVEDetails for ${cveId} (Status: ${status}): ${error.message}`);
    }

    return result;
  }

  /**
   * Intenta descargar snippets de código de exploits desde GitHub o Exploit-DB
   */
  private async fetchExploitCode(refs: string[]): Promise<string> {
    let codeSnippet = "";

    for (const ref of refs) {
      // Estrategia 1: GitHub RAW
      if (ref.includes("github.com") && ref.includes("/blob/")) {
        const rawUrl = ref.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
        try {
          // console.log(`      ⬇️ Fetching raw code from GitHub...`);
          const resp = await axios.get(rawUrl, { timeout: 5000 });
          if (resp.status === 200) {
            const lines = resp.data.toString().split('\n').slice(0, 50);
            codeSnippet += `\n--- Exploit Code from ${ref} ---\n`;
            codeSnippet += lines.join('\n');
            codeSnippet += `\n...\n`;
            console.log(`      🔥 Exploit code extracted from GitHub!`);
            break; // Solo necesitamos uno bueno
          }
        } catch (e) { /* Ignore */ }
      }
      
      // Estrategia 2: Exploit-DB RAW (Scraping básico del bloque de código)
      else if (ref.includes("exploit-db.com/exploits/")) {
        try {
          const resp = await axios.get(ref, {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
            timeout: 5000
          });
          if (resp.status === 200) {
            const $ = cheerio.load(resp.data);
            const codeBlock = $('code, textarea, pre').first();
            if (codeBlock.length) {
              const content = codeBlock.text();
              const lines = content.split('\n').slice(0, 50);
              codeSnippet += `\n--- Exploit Code from ${ref} ---\n`;
              codeSnippet += lines.join('\n');
              codeSnippet += `\n...\n`;
              console.log(`      🔥 Exploit code extracted from Exploit-DB!`);
              break;
            }
          }
        } catch (e) { /* Ignore */ }
      }
    }

    return codeSnippet;
  }

  /**
   * Obtiene referencias adicionales desde el repositorio de Trickest (GitHub RAW)
   * Excelente fuente de respaldo cuando NVD/CVEDetails fallan.
   */
  private async fetchTrickestReferences(cveId: string): Promise<string[]> {
    const year = cveId.split('-')[1];
    const url = `https://raw.githubusercontent.com/trickest/cve/main/${year}/${cveId}.md`;
    const refs: string[] = [];

    try {
      const response = await axios.get(url, { timeout: 5000 });
      if (response.status === 200) {
        // Extraer URLs del markdown
        const content = response.data as string;
        const urlRegex = /https?:\/\/[^\s)]+/g;
        const matches = content.match(urlRegex) || [];
        
        for (const match of matches) {
          // Filtrar enlaces relevantes (GitHub, Exploit-DB, etc.)
          const lower = match.toLowerCase();
          if (["github.com", "exploit-db.com", "packetstormsecurity.com", "rapid7.com", "nvd.nist.gov"].some(d => lower.includes(d))) {
             // Limpiar caracteres extra al final si el regex capturó paréntesis o corchetes de markdown
             const cleanUrl = match.replace(/[)\]]+$/, '');
             refs.push(cleanUrl);
          }
        }
        
        if (refs.length > 0) {
           console.log(`      ✅ Found ${refs.length} refs via Trickest (GitHub) for ${cveId}`);
        }
      }
    } catch (e) {
      // Es normal que falle si el CVE no está indexado aún
    }
    return refs;
  }

  /**
   * Procesa un CVE individual (diseñado para ejecución concurrente)
   */
  private async processCve(cve: CVE): Promise<EnrichedCVE> {
    try {
      // Ejecutar en paralelo EPSS y Detalles
      const [epss, details] = await Promise.all([
        this.getEpssScore(cve.id),
        this.getCveDetailsInfo(cve.id)
      ]);

      // Combinar referencias de NVD (si existen) con las de CVEDetails
      let allReferences = Array.from(new Set([
        ...(cve.nvd_references || []),
        ...(details.external_refs || [])
      ]));

      // Fallback: Si tenemos pocas referencias, intentar Trickest
      if (allReferences.length === 0) {
         // console.log(`      ⚠️ No refs yet. Trying Trickest fallback for ${cve.id}...`);
         const trickestRefs = await this.fetchTrickestReferences(cve.id);
         allReferences = [...allReferences, ...trickestRefs];
      }

      // Debug: Mostrar cuántas referencias tenemos en total antes de buscar exploit
      if (allReferences.length > 0) {
        // console.log(`      📚 Total References for ${cve.id}: ${allReferences.length}`);
      } else {
        console.log(`      ⚠️ No references found for ${cve.id} (NVD, CVEDetails or Trickest). Exploit search will be skipped.`);
      }

      const exploitCode = await this.fetchExploitCode(allReferences);

      // Construir contexto AI
      let contextStr = `Vulnerability ${cve.id} (${details.cwe_id}). `;
      if (epss > 0.1) {
        contextStr += `HIGH exploitation probability (${(epss * 100).toFixed(1)}%). `;
      }
      if (exploitCode) {
        contextStr += `\n\nREAL EXPLOIT CODE FOUND:\n${exploitCode}`;
      }

      return {
        ...cve,
        epss,
        cwe_id: details.cwe_id,
        references: allReferences, // Usar la lista combinada
        exploit_snippet: exploitCode,
        ai_context: contextStr
      };

    } catch (error: any) {
      console.error(`❌ Error processing ${cve.id}: ${error.message}`);
      return cve;
    }
  }

  /**
   * Ejecuta el enriquecimiento masivo
   */
  public async run(cves: CVE[]): Promise<EnrichedCVE[]> {
    console.log(`🚀 Iniciando enriquecimiento PROFUNDO de ${cves.length} CVEs...`);
    
    // 1. Cargar caché de ejecuciones previas
    const existingMap = new Map<string, EnrichedCVE>();
    try {
      await fs.mkdir(TEMP_DIR, { recursive: true });
      const data = await fs.readFile(ENRICHED_FILE, 'utf-8');
      const loaded: EnrichedCVE[] = JSON.parse(data);
      loaded.forEach(c => existingMap.set(c.id, c));
      console.log(`   📦 Caché cargado: ${loaded.length} CVEs previamente enriquecidos.`);
    } catch (e) { /* No cache file yet */ }

    const results: EnrichedCVE[] = [];
    const toProcess: CVE[] = [];

    // 2. Filtrar qué procesar y qué reusar
    for (const cve of cves) {
      if (existingMap.has(cve.id)) {
        const cached = existingMap.get(cve.id)!;
        // Validar si el caché es útil (tiene contexto o exploit)
        // Si no tiene referencias ni exploit, tal vez valga la pena reintentar (fallback Trickest recién añadido)
        const hasData = (cached.exploit_snippet && cached.exploit_snippet.length > 0) || 
                        (cached.references && cached.references.length > 0);
        
        if (hasData) {
          results.push(cached);
          continue; 
        }
      }
      toProcess.push(cve);
    }

    console.log(`   ⚡ Se procesarán ${toProcess.length} CVEs nuevos (o reintentos). ${results.length} recuperados de caché.`);

    // 3. Procesar en lotes
    const BATCH_SIZE = 5; 

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(cve => this.processCve(cve));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      console.log(`   [${Math.min(i + BATCH_SIZE, toProcess.length)}/${toProcess.length}] Procesados...`);
      
      // Guardado incremental para no perder progreso si falla
      if (i % (BATCH_SIZE * 2) === 0) {
         try {
           await fs.writeFile(ENRICHED_FILE, JSON.stringify(results, null, 2));
         } catch (e) { /* Ignore write error during loop */ }
      }

      // Sleep aleatorio
      if (i + BATCH_SIZE < toProcess.length) {
        const delay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 4. Guardado final
    try {
      await fs.writeFile(ENRICHED_FILE, JSON.stringify(results, null, 2));
      console.log(`💾 Resultados de enriquecimiento guardados en ${ENRICHED_FILE}`);
    } catch (e: any) {
      console.error(`⚠️ Error guardando caché de enriquecimiento: ${e.message}`);
    }

    console.log(`✅ Enriquecimiento completado.`);
    return results;
  }
}
