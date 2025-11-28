/**
 * Evidence Preservation and Chain of Custody
 * For forensic integrity in cybersecurity investigations
 */

import crypto from 'crypto';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

export interface EvidenceMetadata {
  id: string;
  filename: string;
  filepath: string;
  fileSize: number;
  collectionDate: Date;
  collectionMethod: string;
  collectedBy: string;
  caseNumber?: string;
  description?: string;
  hashes: {
    md5: string;
    sha1: string;
    sha256: string;
  };
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  timestamp: Date;
  action: 'collected' | 'analyzed' | 'transferred' | 'stored' | 'exported';
  performedBy: string;
  location?: string;
  notes?: string;
  hashVerified?: boolean;
}

/**
 * Evidence Manager
 * Handles evidence collection, preservation, and chain of custody
 */
export class EvidenceManager {
  /**
   * Calculate file hashes (MD5, SHA1, SHA256)
   */
  static async calculateHashes(filePath: string): Promise<{
    md5: string;
    sha1: string;
    sha256: string;
  }> {
    const data = await readFile(filePath);

    return {
      md5: crypto.createHash('md5').update(data).digest('hex'),
      sha1: crypto.createHash('sha1').update(data).digest('hex'),
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
    };
  }

  /**
   * Create evidence metadata for a file
   */
  static async createEvidence(
    filePath: string,
    options: {
      collectionMethod: string;
      collectedBy: string;
      caseNumber?: string;
      description?: string;
    }
  ): Promise<EvidenceMetadata> {
    const stats = await stat(filePath);
    const hashes = await this.calculateHashes(filePath);
    const filename = filePath.split('/').pop() || filePath;

    const evidence: EvidenceMetadata = {
      id: this.generateEvidenceId(),
      filename,
      filepath: filePath,
      fileSize: stats.size,
      collectionDate: new Date(),
      collectionMethod: options.collectionMethod,
      collectedBy: options.collectedBy,
      caseNumber: options.caseNumber,
      description: options.description,
      hashes,
      chainOfCustody: [
        {
          timestamp: new Date(),
          action: 'collected',
          performedBy: options.collectedBy,
          notes: `Evidencia recopilada usando ${options.collectionMethod}`,
          hashVerified: true,
        },
      ],
    };

    return evidence;
  }

  /**
   * Verify evidence integrity by comparing hashes
   */
  static async verifyEvidence(evidence: EvidenceMetadata): Promise<{
    valid: boolean;
    currentHashes: { md5: string; sha1: string; sha256: string };
    message: string;
  }> {
    try {
      const currentHashes = await this.calculateHashes(evidence.filepath);

      const md5Match = currentHashes.md5 === evidence.hashes.md5;
      const sha1Match = currentHashes.sha1 === evidence.hashes.sha1;
      const sha256Match = currentHashes.sha256 === evidence.hashes.sha256;

      const valid = md5Match && sha1Match && sha256Match;

      return {
        valid,
        currentHashes,
        message: valid
          ? 'Integridad de la evidencia verificada - todos los hashes coinciden'
          : `Integridad de la evidencia COMPROMISED - se detectó un desajuste en el hash\n` +
            `Original SHA256: ${evidence.hashes.sha256}\n` +
            `Current SHA256:  ${currentHashes.sha256}`,
      };
    } catch (error: any) {
      return {
        valid: false,
        currentHashes: { md5: '', sha1: '', sha256: '' },
        message: `Verificación de la integridad de la evidencia fallida: ${error.message}`,
      };
    }
  }

  /**
   * Add entry to chain of custody
   */
  static addChainOfCustodyEntry(
    evidence: EvidenceMetadata,
    entry: Omit<ChainOfCustodyEntry, 'timestamp'>
  ): EvidenceMetadata {
    evidence.chainOfCustody.push({
      ...entry,
      timestamp: new Date(),
    });
    return evidence;
  }

  /**
   * Export evidence metadata to JSON
   */
  static async exportMetadata(
    evidence: EvidenceMetadata,
    outputPath: string
  ): Promise<void> {
    await writeFile(outputPath, JSON.stringify(evidence, null, 2));
  }

  /**
   * Generate a unique evidence ID
   */
  private static generateEvidenceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `EV-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Format evidence metadata for display
   */
  static formatMetadata(evidence: EvidenceMetadata): string {
    let output = '\n📋 Metadatos de la Evidencia\n';
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `ID de la Evidencia:      ${evidence.id}\n`;
    output += `Nombre del Archivo:         ${evidence.filename}\n`;
    output += `Tamaño del Archivo:        ${this.formatBytes(evidence.fileSize)}\n`;
    output += `Fecha de Recopilación:  ${evidence.collectionDate.toISOString()}\n`;
    output += `Método de Recopilación: ${evidence.collectionMethod}\n`;
    output += `Recopilado Por:     ${evidence.collectedBy}\n`;

    if (evidence.caseNumber) {
      output += `Número de Caso:      ${evidence.caseNumber}\n`;
    }
    if (evidence.description) {
      output += `Descripción:      ${evidence.description}\n`;
    }

    output += `\n🔐 Hashes Criptográficos\n`;
    output += `MD5:     ${evidence.hashes.md5}\n`;
    output += `SHA1:    ${evidence.hashes.sha1}\n`;
    output += `SHA256:  ${evidence.hashes.sha256}\n`;

    output += `\n📜 Cadena de Custodia (${evidence.chainOfCustody.length} entradas)\n`;
    for (const entry of evidence.chainOfCustody) {
      output += `\n  [${entry.timestamp.toISOString()}]\n`;
      output += `  Acción:       ${entry.action.toUpperCase()}\n`;
      output += `  Realizada Por: ${entry.performedBy}\n`;
      if (entry.location) {
        output += `  Ubicación:     ${entry.location}\n`;
      }
      if (entry.notes) {
        output += `  Notas:        ${entry.notes}\n`;
      }
      if (entry.hashVerified !== undefined) {
        output += `  Hash Verificado: ${entry.hashVerified ? '✓ Sí' : '✗ No'}\n`;
      }
    }

    return output;
  }

  /**
   * Format bytes to human-readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

/**
 * Evidence Report Generator
 * Creates forensically sound reports
 */
export class EvidenceReport {
  /**
   * Generate a complete evidence report in markdown format
   */
  static generateReport(evidence: EvidenceMetadata, analysisResults: string): string {
    let report = `# Reporte de Evidencia Forense\n\n`;
    report += `**Reporte Generado:** ${new Date().toISOString()}\n\n`;
    report += `---\n\n`;

    // Evidence Information
    report += `## Información de la Evidencia\n\n`;
    report += `| Campo | Valor |\n`;
    report += `|-------|-------|\n`;
    report += `| ID de la Evidencia | ${evidence.id} |\n`;
    report += `| Nombre del Archivo | ${evidence.filename} |\n`;
    report += `| Ruta del Archivo | ${evidence.filepath} |\n`;
    report += `| Tamaño del Archivo | ${EvidenceManager['formatBytes'](evidence.fileSize)} |\n`;
    report += `| Fecha de Recopilación | ${evidence.collectionDate.toISOString()} |\n`;
    report += `| Método de Recopilación | ${evidence.collectionMethod} |\n`;
    report += `| Recopilado Por | ${evidence.collectedBy} |\n`;

    if (evidence.caseNumber) {
      report += `| Número de Caso | ${evidence.caseNumber} |\n`;
    }
    if (evidence.description) {
      report += `| Descripción | ${evidence.description} |\n`;
    }

    report += `\n`;

    // Cryptographic Hashes
    report += `## Hashes Criptográficos\n\n`;
    report += `\`\`\`\n`;
    report += `MD5:    ${evidence.hashes.md5}\n`;
    report += `SHA1:   ${evidence.hashes.sha1}\n`;
    report += `SHA256: ${evidence.hashes.sha256}\n`;
    report += `\`\`\`\n\n`;

    // Chain of Custody
    report += `## Cadena de Custodia\n\n`;
    for (const entry of evidence.chainOfCustody) {
      report += `### ${entry.action.toUpperCase()} - ${entry.timestamp.toISOString()}\n\n`;
      report += `- **Realizada Por:** ${entry.performedBy}\n`;
      if (entry.location) {
        report += `- **Ubicación:** ${entry.location}\n`;
      }
      if (entry.notes) {
        report += `- **Notas:** ${entry.notes}\n`;
      }
      if (entry.hashVerified !== undefined) {
        report += `- **Hash Verificado:** ${entry.hashVerified ? '✓ Sí' : '✗ No'}\n`;
      }
      report += `\n`;
    }

    // Analysis Results
    report += `## Resultados de Análisis\n\n`;
    report += analysisResults;
    report += `\n\n`;

    // Footer
    report += `---\n\n`;
    report += `*Este reporte fue generado automáticamente por Securetag AI.*\n`;
    report += `*Toda la evidencia ha sido preservada con verificación de integridad criptográfica.*\n`;

    return report;
  }
}