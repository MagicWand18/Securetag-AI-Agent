/**
 * MITRE ATT&CK Framework Integration
 * Maps security findings to ATT&CK techniques
 */

export interface MitreTechnique {
  id: string; // e.g., "T1566"
  name: string;
  tactics: string[]; // Initial Access, Execution, etc.
  description: string;
  url: string;
  subtechniques?: MitreTechnique[];
}

export interface MitreMapping {
  technique: MitreTechnique;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

/**
 * MITRE ATT&CK Mapper
 * Maps security findings to ATT&CK techniques
 */
export class MitreMapper {
  private static readonly TECHNIQUES: Record<string, MitreTechnique> = {
    // Initial Access
    T1190: {
      id: 'T1190',
      name: 'Exploit Public-Facing Application',
      tactics: ['Initial Access'],
      description: 'Adversarios podrían explotar debilidades en aplicaciones expuestas a Internet para acceder a sistemas.',
      url: 'https://attack.mitre.org/techniques/T1190/',
    },
    T1566: {
      id: 'T1566',
      name: 'Phishing',
      tactics: ['Initial Access'],
      description: 'Adversarios podrían enviar mensajes de phishing para acceder a sistemas de víctimas.',
      url: 'https://attack.mitre.org/techniques/T1566/',
    },

    // Execution
    T1059: {
      id: 'T1059',
      name: 'Command and Scripting Interpreter',
      tactics: ['Execution'],
      description: 'Adversarios podrían utilizar intérpretes de comandos y scripts para ejecutar comandos, scripts o binarios.',
      url: 'https://attack.mitre.org/techniques/T1059/',
    },
    T1203: {
      id: 'T1203',
      name: 'Exploitation for Client Execution',
      tactics: ['Execution'],
      description: 'Adversarios podrían explotar vulnerabilidades en aplicaciones cliente para ejecutar código.',
      url: 'https://attack.mitre.org/techniques/T1203/',
    },

    // Persistence
    T1176: {
      id: 'T1176',
      name: 'Browser Extensions',
      tactics: ['Persistence'],
      description: 'Adversarios podrían utilizar extensiones de navegador para establecer acceso persistente.',
      url: 'https://attack.mitre.org/techniques/T1176/',
    },
    T1543: {
      id: 'T1543',
      name: 'Create or Modify System Process',
      tactics: ['Persistence', 'Privilege Escalation'],
      description: 'Adversarios podrían crear o modificar procesos del sistema para ejecutar repetidamente payloads maliciosos.',
      url: 'https://attack.mitre.org/techniques/T1543/',
    },

    // Defense Evasion
    T1140: {
      id: 'T1140',
      name: 'Deobfuscate/Decode Files or Information',
      tactics: ['Defense Evasion'],
      description: 'Adversarios podrían utilizar archivos o información obfuscada para ocultar artefactos de una intrusión.',
      url: 'https://attack.mitre.org/techniques/T1140/',
    },
    T1562: {
      id: 'T1562',
      name: 'Impair Defenses',
      tactics: ['Defense Evasion'],
      description: 'Adversarios podrían modificar componentes de un entorno víctima de forma maliciosa para impedir o desactivar mecanismos de defensa.',
      url: 'https://attack.mitre.org/techniques/T1562/',
    },

    // Credential Access
    T1110: {
      id: 'T1110',
      name: 'Brute Force',
      tactics: ['Credential Access'],
      description: 'Adversarios podrían utilizar técnicas de fuerza bruta para acceder a cuentas.',
      url: 'https://attack.mitre.org/techniques/T1110/',
    },
    T1552: {
      id: 'T1552',
      name: 'Unsecured Credentials',
      tactics: ['Credential Access'],
      description: 'Adversarios podrían buscar sistemas comprometidos para encontrar y obtener credenciales almacenadas inseguramente.',
      url: 'https://attack.mitre.org/techniques/T1552/',
    },

    // Discovery
    T1046: {
      id: 'T1046',
      name: 'Network Service Discovery',
      tactics: ['Discovery'],
      description: 'Adversarios podrían intentar obtener una lista de servicios en ejecución en hosts remotos y dispositivos de infraestructura de red local.',
      url: 'https://attack.mitre.org/techniques/T1046/',
    },
    T1018: {
      id: 'T1018',
      name: 'Remote System Discovery',
      tactics: ['Discovery'],
      description: 'Adversarios podrían intentar obtener una lista de otros sistemas por dirección IP, nombre de host o otro identificador lógico.',
      url: 'https://attack.mitre.org/techniques/T1018/',
    },

    // Collection
    T1113: {
      id: 'T1113',
      name: 'Screen Capture',
      tactics: ['Collection'],
      description: 'Adversarios podrían intentar capturar pantallas para recopilar información.',
      url: 'https://attack.mitre.org/techniques/T1113/',
    },
    T1557: {
      id: 'T1557',
      name: 'Adversary-in-the-Middle',
      tactics: ['Collection', 'Credential Access'],
      description: 'Adversarios podrían intentar posicionarse entre dos o más dispositivos conectados a una red para interceptar tráfico.',
      url: 'https://attack.mitre.org/techniques/T1557/',
    },

    // Command and Control
    T1071: {
      id: 'T1071',
      name: 'Application Layer Protocol',
      tactics: ['Command and Control'],
      description: 'Adversarios podrían comunicarse utilizando protocolos de capa de aplicación de la OSI para evitar la detección.',
      url: 'https://attack.mitre.org/techniques/T1071/',
    },
    T1573: {
      id: 'T1573',
      name: 'Encrypted Channel',
      tactics: ['Command and Control'],
      description: 'Adversarios podrían utilizar algoritmos de encriptación conocidos para ocultar el tráfico de comandos y control.',
      url: 'https://attack.mitre.org/techniques/T1573/',
    },
    T1095: {
      id: 'T1095',
      name: 'Non-Application Layer Protocol',
      tactics: ['Command and Control'],
      description: 'Adversarios podrían utilizar protocolos de capa de transporte de la OSI para comunicarse.',
      url: 'https://attack.mitre.org/techniques/T1095/',
    },

    // Exfiltration
    T1041: {
      id: 'T1041',
      name: 'Exfiltration Over C2 Channel',
      tactics: ['Exfiltration'],
      description: 'Adversarios podrían extraer datos mediante la exfiltración sobre un canal de comandos y control existente.',
      url: 'https://attack.mitre.org/techniques/T1041/',
    },
    T1048: {
      id: 'T1048',
      name: 'Exfiltration Over Alternative Protocol',
      tactics: ['Exfiltration'],
      description: 'Adversarios podrían extraer datos mediante la exfiltración sobre un canal de comandos y control existente utilizando un protocolo diferente.',
      url: 'https://attack.mitre.org/techniques/T1048/',
    },

    // Impact
    T1486: {
      id: 'T1486',
      name: 'Data Encrypted for Impact',
      tactics: ['Impact'],
      description: 'Adversarios podrían cifrar datos en sistemas objetivo o en una gran cantidad de sistemas en una red para interrumpir la disponibilidad.',
      url: 'https://attack.mitre.org/techniques/T1486/',
    },
    T1498: {
      id: 'T1498',
      name: 'Network Denial of Service',
      tactics: ['Impact'],
      description: 'Adversarios podrían realizar ataques de Denegación de Servicio (DoS) para degradar o bloquear la disponibilidad de recursos objetivo.',
      url: 'https://attack.mitre.org/techniques/T1498/',
    },
  };

  /**
   * Map a finding to MITRE ATT&CK techniques
   */
  mapFinding(findingTitle: string, findingDescription: string, category?: string): MitreMapping[] {
    const mappings: MitreMapping[] = [];
    const searchText = `${findingTitle} ${findingDescription} ${category || ''}`.toLowerCase();

    // XSS / Injection vulnerabilities
    if (searchText.includes('xss') || searchText.includes('cross-site scripting') || searchText.includes('injection')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1059,
        confidence: 'high',
        evidence: 'Vulnerabilidad de inyección de código permite la ejecución de scripts arbitrarios',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1203,
        confidence: 'medium',
        evidence: 'Explotación del lado del cliente es posible a través de inyección de código',
      });
    }

    // Missing security headers / Weak configuration
    if (searchText.includes('missing') && searchText.includes('header')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1562,
        confidence: 'medium',
        evidence: 'Falta de encabezados de seguridad debilita las capacidades defensivas',
      });
    }

    // SQL Injection
    if (searchText.includes('sql') && searchText.includes('injection')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1190,
        confidence: 'high',
        evidence: 'Inyección de SQL permite la explotación de aplicaciones expuestas a Internet',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1552,
        confidence: 'high',
        evidence: 'Credenciales de base de datos pueden ser accesibles a través de SQL injection',
      });
    }

    // Brute force vulnerabilities
    if (searchText.includes('brute') || searchText.includes('rate limit')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1110,
        confidence: 'high',
        evidence: 'Falta de rate limit puede habilitar ataques de fuerza bruta',
      });
    }

    // CSRF
    if (searchText.includes('csrf') || searchText.includes('cross-site request')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1190,
        confidence: 'medium',
        evidence: 'CSRF permite acciones no autorizadas',
      });
    }

    // Port scanning
    if (searchText.includes('port scan') || searchText.includes('network scan')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1046,
        confidence: 'high',
        evidence: 'Escaneo de puertos detectado',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1018,
        confidence: 'medium',
        evidence: 'Actividad de reconocimiento de red',
      });
    }

    // Browser hijacker / Adware
    if (searchText.includes('hijack') || searchText.includes('adware') || searchText.includes('browser extension')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1176,
        confidence: 'high',
        evidence: 'Browser hijacker establece persistencia a través de extensiones',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1071,
        confidence: 'medium',
        evidence: 'Comunicación C2 basada en HTTP para adware/tracking',
      });
    }

    // Unencrypted traffic
    if (searchText.includes('unencrypted') || searchText.includes('http traffic') || searchText.includes('plaintext')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1557,
        confidence: 'medium',
        evidence: 'Tráfico sin cifrar susceptible a ataques de intercepción por parte de adversarios',
      });
    }

    // C2 / Command and Control
    if (searchText.includes('c2') || searchText.includes('command and control') || searchText.includes('c&c')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1071,
        confidence: 'high',
        evidence: 'Protocolo de capa de aplicación utilizado para la comunicación C2',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1041,
        confidence: 'medium',
        evidence: 'Exfiltración de datos sobre el canal C2',
      });
    }

    // Obfuscated data
    if (searchText.includes('obfuscated') || searchText.includes('encoded') || searchText.includes('base64')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1140,
        confidence: 'medium',
        evidence: 'Dato obfuscado puede ocultar payloads maliciosos',
      });
    }

    // Data exfiltration
    if (searchText.includes('exfiltration') || searchText.includes('data leak') || searchText.includes('tracking')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1048,
        confidence: 'medium',
        evidence: 'Protocolo alternativo utilizado para la exfiltración de datos',
      });
    }

    return mappings;
  }

  /**
   * Get technique by ID
   */
  static getTechnique(id: string): MitreTechnique | undefined {
    return MitreMapper.TECHNIQUES[id];
  }

  /**
   * Get all techniques by tactic
   */
  static getTechniquesByTactic(tactic: string): MitreTechnique[] {
    return Object.values(MitreMapper.TECHNIQUES).filter(t => t.tactics.includes(tactic));
  }

  /**
   * Format MITRE mappings for display
   */
  static formatMappings(mappings: MitreMapping[]): string {
    if (mappings.length === 0) return '';

    let output = '\n🎯 Mapeo MITRE ATT&CK:\n';
    for (const mapping of mappings) {
      const confidenceEmoji = mapping.confidence === 'high' ? '🔴' :
                             mapping.confidence === 'medium' ? '🟡' : '🟢';
      output += `  ${confidenceEmoji} ${mapping.technique.id} - ${mapping.technique.name}\n`;
      output += `     Tácticas: ${mapping.technique.tactics.join(', ')}\n`;
      output += `     Confianza: ${mapping.confidence}\n`;
      output += `     Evidencia: ${mapping.evidence}\n`;
      output += `     Referencia: ${mapping.technique.url}\n`;
    }
    return output;
  }
}