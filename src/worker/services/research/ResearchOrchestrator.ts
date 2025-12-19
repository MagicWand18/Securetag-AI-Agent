import { ThreatMonitor } from './ThreatMonitor.js';
import { ThreatEnricher } from './ThreatEnricher.js';
import { SyntheticRuleGen } from './SyntheticRuleGen.js';

export class ResearchOrchestrator {
  private monitor: ThreatMonitor;
  private enricher: ThreatEnricher;
  private generator: SyntheticRuleGen;

  constructor(apiKey: string) {
    this.monitor = new ThreatMonitor();
    this.enricher = new ThreatEnricher();
    // Leer modelo de entorno o usar default
    const model = process.env.OPENAI_MODEL || 'gpt-5.1';
    this.generator = new SyntheticRuleGen(apiKey, model);
  }

  /**
   * Ejecuta el pipeline completo de investigación
   */
  public async runPipeline(): Promise<void> {
    const startTime = Date.now();
    console.log("==================================================");
    console.log("🛡️  SECURETAG AUTOMATED RESEARCH PIPELINE STARTED");
    console.log("==================================================\n");

    try {
      // 1. Monitoreo
      console.log("--- PHASE 1: THREAT MONITORING ---");
      const cves = await this.monitor.run();
      
      if (cves.length === 0) {
        console.log("⚠️ No threats found. Pipeline stopping.");
        return;
      }

      // 2. Enriquecimiento
      console.log("\n--- PHASE 2: DATA ENRICHMENT ---");
      const enrichedCves = await this.enricher.run(cves);

      // 3. Generación
      console.log("\n--- PHASE 3: SYNTHETIC RULE GENERATION ---");
      await this.generator.run(enrichedCves);

    } catch (error: any) {
      console.error("\n❌ CRITICAL PIPELINE FAILURE:", error.message);
    } finally {
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
      console.log(`\n✅ Pipeline Finished in ${duration} minutes.`);
      console.log("==================================================");
    }
  }
}

import { fileURLToPath } from 'url';

// Punto de entrada para ejecución standalone (ej. Cron Job)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY environment variable is required.");
    process.exit(1);
  }
  
  const orchestrator = new ResearchOrchestrator(apiKey);
  orchestrator.runPipeline();
}
