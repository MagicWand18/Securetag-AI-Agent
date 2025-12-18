import axios from 'axios';
import { subDays, parseISO, isBefore } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de Directorios
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '../../../../');
const TEMP_DIR = path.join(BASE_DIR, 'scripts/research/temp');

// Tipos para estructurar los datos de vulnerabilidades
export interface CVE {
  id: string;
  title: string;
  cvss: number;
  description: string;
  affected_tech: string[];
  year: number;
  source: 'NVD' | 'CISA_KEV' | 'GHSA';
  vector?: string;
  nvd_references?: string[]; // Nueva propiedad para almacenar referencias directas de NVD
}

// Lista de tecnologías relevantes para filtrar
const RELEVANT_KEYWORDS = [
  // Web / Frontend
  "javascript", "typescript", "node", "npm", "react", "vue", "angular", "svelte", "next.js", "nuxt", "electron",
  // Backend / API
  "python", "django", "flask", "fastapi", "java", "spring", "kotlin", "go", "golang", "ruby", "rails", "php", "laravel", "c#", ".net",
  // Infra / Cloud / Containers
  "docker", "kubernetes", "k8s", "terraform", "aws", "azure", "gcp", "nginx", "apache"
];

export class ThreatMonitor {
  
  /**
   * Consulta el catálogo CISA Known Exploited Vulnerabilities (KEV)
   */
  private async fetchCisaKev(): Promise<CVE[]> {
    console.log("🔍 Consultando CISA KEV Catalog...");
    const url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

    try {
      const response = await axios.get(url, { timeout: 15000 });
      const vulnerabilities = response.data.vulnerabilities || [];
      
      console.log(`   ✅ CISA KEV respondió. Analizando ${vulnerabilities.length} registros...`);

      const results: CVE[] = [];
      const cutoffDate = subDays(new Date(), 365 * 10); // Últimos 10 años

      for (const item of vulnerabilities) {
        const dateAdded = parseISO(item.dateAdded);
        if (isBefore(dateAdded, cutoffDate)) continue;

        const desc = (item.shortDescription || "").toLowerCase();
        const product = (item.product || "").toLowerCase();
        const vendor = (item.vendorProject || "").toLowerCase();

        const isRelevant = RELEVANT_KEYWORDS.some(k => 
          desc.includes(k) || product.includes(k) || vendor.includes(k)
        );

        if (isRelevant) {
          results.push({
            id: item.cveID,
            title: `${item.cveID} - ${item.vulnerabilityName}`,
            cvss: 9.0, // Default alto para KEV
            description: `[EXPLOTADO ACTIVAMENTE] ${item.shortDescription}`,
            affected_tech: [product],
            year: parseInt(item.cveID.split('-')[1]),
            source: 'CISA_KEV'
          });
        }
      }
      return results;
    } catch (error: any) {
      console.error(`❌ Error consultando CISA KEV: ${error.message}`);
      return [];
    }
  }

  /**
   * Consulta la API de NVD (NIST)
   */
  private async fetchNvdCves(): Promise<CVE[]> {
    console.log("🔍 Consultando API NVD (NIST) en tiempo real...");
    const results: CVE[] = [];
    
    // Configurar fechas (últimos 120 días)
    const endDate = new Date();
    const startDate = subDays(endDate, 120);
    
    // Formato requerido por NVD: YYYY-MM-DDTHH:mm:ss.SSS
    const pubStart = startDate.toISOString().replace('Z', '');
    const pubEnd = endDate.toISOString().replace('Z', '');

    const baseUrl = "https://services.nvd.nist.gov/rest/json/cves/2.0";
    const params = {
      pubStartDate: pubStart,
      pubEndDate: pubEnd,
      cvssV3Severity: "HIGH", // Trae HIGH y CRITICAL
      resultsPerPage: 2000
    };

    try {
      const response = await axios.get(baseUrl, { 
        params, 
        headers: { "User-Agent": "SecureTag-Research-Agent/1.0" },
        timeout: 30000 
      });

      if (response.status === 200) {
        const vulnerabilities = response.data.vulnerabilities || [];
        console.log(`   ✅ NVD respondió. Analizando ${vulnerabilities.length} vulnerabilidades recientes...`);

        for (const item of vulnerabilities) {
          const cve = item.cve || {};
          const descriptions = cve.descriptions || [];
          const descObj = descriptions.find((d: any) => d.lang === "en");
          const desc = (descObj ? descObj.value : "").toLowerCase();

          // Filtrar localmente por keywords
          const isRelevant = RELEVANT_KEYWORDS.some(k => desc.includes(k));
          if (!isRelevant) continue;

          // Obtener métricas CVSS
          const metrics = cve.metrics?.cvssMetricV31 || [];
          const score = metrics.length > 0 ? metrics[0].cvssData.baseScore : 0.0;
          const vector = metrics.length > 0 ? metrics[0].cvssData.vectorString : "";

          // Obtener referencias de NVD
          const references = (cve.references || []).map((r: any) => r.url);

          // Filtro de Score (>= 6.0 para mantener alineación con Python)
          if (score >= 6.0) {
            results.push({
              id: cve.id,
              title: `${cve.id} - Critical/High Severity`,
              cvss: score,
              description: desc,
              affected_tech: ["unknown"],
              year: parseInt(cve.id.split('-')[1]),
              source: 'NVD',
              vector: vector,
              nvd_references: references
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Error NVD: ${error.message}`);
    }
    
    return results;
  }

  /**
   * Consulta GitHub Advisory Database (GHSA)
   * (Implementación placeholder para futuro - requiere Token de GitHub)
   */
  private async fetchGithubAdvisories(): Promise<CVE[]> {
    // TODO: Implementar consulta GraphQL a GitHub API
    // Por ahora retornamos array vacío para no bloquear el flujo si no hay token configurado
    return [];
  }

  /**
   * Ejecuta el monitoreo completo consolidando fuentes
   */
  public async run(): Promise<CVE[]> {
    console.log("🚀 Iniciando Monitor de Amenazas...");
    
    // Ejecutar consultas en paralelo
    const [cisaCves, nvdCves] = await Promise.all([
      this.fetchCisaKev(),
      this.fetchNvdCves()
    ]);

    // Consolidar y deduplicar usando un Map por ID
    const allCvesMap = new Map<string, CVE>();
    
    [...nvdCves, ...cisaCves].forEach(cve => {
      // Si ya existe, preferimos la versión de CISA KEV por ser más crítica
      // PERO, intentamos preservar las referencias de NVD si existen en el otro objeto
      if (allCvesMap.has(cve.id)) {
        const existing = allCvesMap.get(cve.id)!;
        
        // Merge de referencias (si el nuevo tiene, se las pasamos al existente o viceversa)
        const combinedRefs = Array.from(new Set([
          ...(existing.nvd_references || []),
          ...(cve.nvd_references || [])
        ]));
        
        if (cve.source === 'CISA_KEV') {
          cve.nvd_references = combinedRefs;
          allCvesMap.set(cve.id, cve);
        } else {
          existing.nvd_references = combinedRefs;
          allCvesMap.set(cve.id, existing);
        }
      } else {
        allCvesMap.set(cve.id, cve);
      }
    });

    const consolidated = Array.from(allCvesMap.values());

    // Ordenar: KEV primero, luego por CVSS descendente
    consolidated.sort((a, b) => {
      if (a.source === 'CISA_KEV' && b.source !== 'CISA_KEV') return -1;
      if (a.source !== 'CISA_KEV' && b.source === 'CISA_KEV') return 1;
      return b.cvss - a.cvss;
    });

    console.log(`\n🚨 Se encontraron ${consolidated.length} vulnerabilidades críticas REALES.`);
    
    // Guardar para persistencia y uso en siguientes fases
    try {
      await fs.mkdir(TEMP_DIR, { recursive: true });
      await fs.writeFile(
        path.join(TEMP_DIR, 'trending_cves.json'), 
        JSON.stringify(consolidated, null, 2)
      );
      console.log("💾 Lista guardada en trending_cves.json");
    } catch (e: any) {
      console.error(`⚠️ Error guardando trending_cves.json: ${e.message}`);
    }

    return consolidated;
  }
}
