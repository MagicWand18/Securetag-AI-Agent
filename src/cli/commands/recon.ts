/**
 * OSINT Reconnaissance Command
 * Comprehensive OSINT scanning with multiple modes
 */

import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { OSINTOrchestrator, OSINTReporter } from '../../agent/tools/osint/index.js';
import { logger } from '../../utils/logger.js';

export function createReconCommand(): Command {
  const recon = new Command('recon');

  recon
    .description('Realizar una recopilación de información OSINT sobre objetivos (dominios, usuarios, IPs)')
    .argument('<target>', 'Objetivo a investigar (dominio, usuario o IP)')
    .option('--quick', 'Escaneo rápido (solo información esencial)')
    .option('--full', 'Escaneo completo (todas las herramientas OSINT)')
    .option('--domain', 'Recopilación de información enfocada en dominios')
    .option('--person', 'Recopilación de información enfocada en personas (usuario/email)')
    .option('--export-json <file>', 'Exportar resultados a archivo JSON')
    .option('--export-md <file>', 'Exportar resultados a archivo Markdown')
    .action(async (target: string, options) => {
      try {
        ui.banner();

        // Determine scan type
        let scanType: 'quick' | 'full' | 'domain' | 'person' = 'quick';
        if (options.full) scanType = 'full';
        else if (options.domain) scanType = 'domain';
        else if (options.person) scanType = 'person';

        ui.section('🔍 Recopilación de información OSINT');
        console.log(`Objetivo: ${target}`);
        console.log(`Tipo de escaneo: ${scanType.toUpperCase()}`);

        const orchestrator = new OSINTOrchestrator();
        const reporter = new OSINTReporter();

        const spinner = ui.spinner('Iniciando recopilación de información...').start();

        let result;
        try {
          switch (scanType) {
            case 'quick':
              result = await orchestrator.quickScan(target);
              break;
            case 'full':
              result = await orchestrator.fullScan(target);
              break;
            case 'domain':
              result = await orchestrator.domainScan(target);
              break;
            case 'person':
              result = await orchestrator.personScan(target);
              break;
          }

          spinner.succeed('Recopilación de información completada');
        } catch (error) {
          spinner.fail('Recopilación de información fallida');
          throw error;
        }

        // Display results
        reporter.displayResults(result);

        // Export if requested
        if (options.exportJson) {
          await reporter.exportJSON(result, options.exportJson);
        }

        if (options.exportMd) {
          await reporter.exportMarkdown(result, options.exportMd);
        }

        // Final summary
        const riskLevel =
          result.summary.riskScore > 70
            ? 'HIGH'
            : result.summary.riskScore > 40
              ? 'MEDIUM'
              : 'LOW';

        ui.info(
          `\nRecopilación de información completada: ${result.summary.totalFindings} encontradas | Riesgo: ${riskLevel}`
        );

        logger.info(`Recopilación de información OSINT completada para ${target}`);
      } catch (error) {
        logger.error('Comando de recopilación de información fallido:', error);
        ui.error(
          `Recopilación de información fallida: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
        process.exit(1);
      }
    });

  // Add subcommands for specific tools
  recon
    .command('dns <domain>')
    .description('Recopilación de información DNS')
    .action(async (domain: string) => {
      try {
        const { DNSRecon } = await import('../../agent/tools/osint/index.js');
        const dnsRecon = new DNSRecon();

        const spinner = ui.spinner('Realizando recopilación de información DNS...').start();
        const result = await dnsRecon.scan(domain);
        spinner.succeed('Recopilación de información DNS completada');

        ui.section(`Registros DNS - ${domain}`);

        if (result.records.A) {
          console.log(`A: ${result.records.A.join(', ')}`);
        }
        if (result.records.MX) {
          console.log(`MX: ${result.records.MX.join(', ')}`);
        }
        if (result.records.NS) {
          console.log(`NS: ${result.records.NS.join(', ')}`);
        }
        if (result.records.TXT) {
          console.log(`TXT: ${result.records.TXT.length} registro(s)`);
        }
      } catch (error) {
        ui.error(`Recopilación de información DNS fallida: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });

  recon
    .command('subdomains <domain>')
    .description('Enumeración de subdominios')
    .action(async (domain: string) => {
      try {
        const { SubdomainEnum } = await import('../../agent/tools/osint/index.js');
        const subdomainEnum = new SubdomainEnum();

        const spinner = ui.spinner('Enumerando subdominios...').start();
        const result = await subdomainEnum.enumerate(domain, {
          useCertTransparency: true,
          useBruteForce: true,
        });
        spinner.succeed(`Subdominios encontrados: ${result.total}`);

        ui.section(`Subdominios - ${domain}`);
        result.subdomains.forEach((sub) => {
          const ips = sub.ip ? ` [${sub.ip.join(', ')}]` : '';
          console.log(`  • ${sub.subdomain}${ips}`);
        });
      } catch (error) {
        ui.error(`Enumeración de subdominios fallida: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });

  recon
    .command('emails <domain>')
    .description('Recopilación de direcciones de correo electrónico')
    .action(async (domain: string) => {
      try {
        const { EmailHarvest } = await import('../../agent/tools/osint/index.js');
        const emailHarvest = new EmailHarvest();

        const spinner = ui.spinner('Recopilando direcciones de correo electrónico...').start();
        const result = await emailHarvest.harvest(domain);
        spinner.succeed(`Direcciones de correo electrónico encontradas: ${result.total}`);

        ui.section(`Direcciones de correo electrónico - ${domain}`);
        result.emails.forEach((email) => {
          const verified = email.verified ? '[✓]' : '[?]';
          console.log(`  ${verified} ${email.email}`);
        });
      } catch (error) {
        ui.error(`Recopilación de direcciones de correo electrónico fallida: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });

  recon
    .command('username <username>')
    .description('Enumeración de nombres de usuario en plataformas')
    .action(async (username: string) => {
      try {
        const { UsernameEnum } = await import('../../agent/tools/osint/index.js');
        const usernameEnum = new UsernameEnum();

        const spinner = ui.spinner('Enumerando nombres de usuario en plataformas...').start();
        const result = await usernameEnum.enumerate(username);
        spinner.succeed(`Perfiles encontrados: ${result.totalFound}`);

        ui.section(`Perfiles de redes sociales - ${username}`);
        result.profiles
          .filter((p) => p.exists)
          .forEach((profile) => {
            console.log(`  ✓ ${profile.platform}: ${profile.url}`);
          });
      } catch (error) {
        ui.error(`Enumeración de nombres de usuario en plataformas fallida: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });

  recon
    .command('breach <email>')
    .description('Comprobación de posibles brechas de datos en una dirección de correo electrónico')
    .action(async (email: string) => {
      try {
        const { BreachCheck } = await import('../../agent/tools/osint/index.js');
        const breachCheck = new BreachCheck();

        const spinner = ui.spinner('Comprobando bases de datos de posibles brechas de datos...').start();
        const result = await breachCheck.checkEmail(email);

        if (result.breached) {
          spinner.fail(`Email encontrado en ${result.totalBreaches} brecha(s)`);

          ui.section(`⚠️  Posibles brechas de datos - ${email}`);
          result.breaches.forEach((breach) => {
            console.log(`\n${breach.title} (${breach.breachDate})`);
            console.log(
              `  Cuentas afectadas: ${breach.pwnCount.toLocaleString()}`
            );
            console.log(`  Datos afectados: ${breach.dataClasses.join(', ')}`);
          });

          const recommendations = breachCheck.generateRecommendations(result);
          console.log('\n💡 Recomendaciones:');
          recommendations.forEach((rec) => {
            console.log(`  • ${rec}`);
          });
        } else {
          spinner.succeed('No se encontraron brechas de datos');
          ui.success('✓ Email no encontrado en ninguna base de datos de posibles brechas de datos');
        }
      } catch (error) {
        ui.error(`Comprobación brechas de datos fallida: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });

  recon
    .command('tech <url>')
    .description('Detección de tecnologías utilizadas por un sitio web')
    .action(async (url: string) => {
      try {
        const { TechDetect } = await import('../../agent/tools/osint/index.js');
        const techDetect = new TechDetect();

        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }

        const spinner = ui.spinner('Detección de tecnologías...').start();
        const result = await techDetect.detect(url);
        spinner.succeed(`Detectadas ${result.technologies.length} tecnologías`);

        ui.section(`Stack de tecnologías - ${url}`);

        if (result.server) {
          console.log(`Servidor: ${result.server}`);
        }

        const techsByCategory = new Map<string, string[]>();
        result.technologies.forEach((tech) => {
          tech.categories.forEach((cat) => {
            if (!techsByCategory.has(cat)) {
              techsByCategory.set(cat, []);
            }
            techsByCategory.get(cat)!.push(tech.name);
          });
        });

        techsByCategory.forEach((techs, category) => {
          console.log(`\n${category}:`);
          techs.forEach((tech) => console.log(`  • ${tech}`));
        });
      } catch (error) {
        ui.error(`Detección de tecnologías fallida: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });

  recon
    .command('ip <ip>')
    .description('Análisis de dirección IP (geolocalización, búsqueda inversa)')
    .action(async (ip: string) => {
      try {
        const { IPLookup } = await import('../../agent/tools/osint/index.js');
        const ipLookup = new IPLookup();

        const spinner = ui.spinner('Análisis de dirección IP...').start();
        const result = await ipLookup.analyzeIP(ip);
        spinner.succeed('Análisis de dirección IP completado');

        ui.section(`Análisis de dirección IP - ${ip}`);

        console.log('\nGeolocalización:');
        console.log(
          `  Ubicación: ${result.geolocation.city}, ${result.geolocation.region}, ${result.geolocation.country}`
        );
        console.log(`  ISP: ${result.geolocation.isp}`);
        console.log(`  Organización: ${result.geolocation.org}`);

        if (result.reverseDNS.length > 0) {
          console.log(`\nBúsqueda inversa DNS: ${result.reverseDNS.join(', ')}`);
        }

        if (result.reverseIP.total > 0) {
          console.log(`\nDominios en la misma IP: ${result.reverseIP.total}`);
          result.reverseIP.domains.slice(0, 10).forEach((domain) => {
            console.log(`  • ${domain}`);
          });
        }

        console.log('\nInsights:');
        if (result.insights.isHosting) {
          console.log(
            `  • Hosteado en ${result.insights.hostingProvider || 'proveedor de hosting'}`
          );
        }
        if (result.insights.isVPN) {
          console.log(
            `  • VPN/Proxy detectado: ${result.insights.vpnProvider}`
          );
        }
        if (result.insights.sharedHosting) {
          console.log(
            `  • Hosteado en compartido (${result.insights.totalDomainsOnIP} dominios en la IP)`
          );
        }
      } catch (error) {
        ui.error(`Análisis de dirección IP fallido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });

  return recon;
}