import http from 'http';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { ReportService } from '../reports/ReportService.js';
import { ExecutiveReport } from '../reports/templates/ExecutiveReport.js';
import { TechnicalReport } from '../reports/templates/TechnicalReport.js';
import { GlobalReport } from '../reports/templates/GlobalReport.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.js';
import { dbQuery } from '../../utils/db.js';
// @ts-ignore
import xml from 'xml-js';

// Helper for sending responses (copied from other routes)
function send(res: http.ServerResponse, code: number, body: any, contentType = 'application/json') {
  if (contentType === 'application/json') {
    const data = JSON.stringify(body);
    res.statusCode = code;
    res.setHeader('Content-Type', contentType);
    res.end(data);
  } else {
    res.statusCode = code;
    res.setHeader('Content-Type', contentType);
    res.end(body);
  }
}

export const reportsHandler = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> => {
  const url = req.url || '';
  const method = req.method;

  // Route: GET /reports/:taskId/:type
  // Types: executive (pdf), technical (pdf), json, xml
  if (method === 'GET' && url.startsWith('/reports/')) {
    const authReq = req as AuthenticatedRequest;
    const isAuthenticated = await authenticate(authReq, res);
    if (!isAuthenticated) return true; // Handled by auth (401 sent)

    const parts = url.split('/');
    
    // Special Route: /reports/project/:projectId/global
    if (parts[2] === 'project' && parts.length >= 5 && parts[4] === 'global') {
        const projectId = parts[3];
        const tenantId = authReq.tenantId;

        try {
            // 1. Verify ownership (Support UUID or Alias)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
            let projectCheck;
            
            if (isUuid) {
                projectCheck = await dbQuery<any>(
                    'SELECT id FROM securetag.project WHERE id=$1 AND tenant_id=$2',
                    [projectId, tenantId]
                );
            } else {
                projectCheck = await dbQuery<any>(
                    'SELECT id FROM securetag.project WHERE alias=$1 AND tenant_id=$2',
                    [projectId, tenantId]
                );
            }

            if (projectCheck.rows.length === 0) {
                send(res, 404, { ok: false, error: 'Project not found or access denied' });
                return true;
            }
            
            // Use the resolved real ID
            const realProjectId = projectCheck.rows[0].id;

            // 2. Fetch Data
            const data = await ReportService.getGlobalReportData(realProjectId);

            // 3. Render
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="aegis-global-${realProjectId.slice(0,8)}.pdf"`);

            const element = React.createElement(GlobalReport, { data }) as any;
            const stream = await renderToStream(element);
            stream.pipe(res);

        } catch (e: any) {
            console.error('Global Report generation error:', e);
            send(res, 500, { ok: false, error: 'Failed to generate global report: ' + e.message });
        }
        return true;
    }

    // Expected: ["", "reports", "TASK_ID", "TYPE"]
    if (parts.length < 4) {
      send(res, 400, { ok: false, error: 'Invalid report URL format' });
      return true;
    }

    const taskId = parts[2];
    const reportType = parts[3].toLowerCase();
    const tenantId = authReq.tenantId;

    try {
      // 1. Verify ownership
      const taskCheck = await dbQuery<any>(
        'SELECT id FROM securetag.task WHERE id=$1 AND tenant_id=$2', 
        [taskId, tenantId]
      );
      
      if (taskCheck.rows.length === 0) {
        send(res, 404, { ok: false, error: 'Task not found or access denied' });
        return true;
      }

      // 2. Get User Context (for report header)
      // We can try to get user info from the auth token payload if available, or DB
      // For now, we'll fetch tenant info as proxy
      const tenantInfo = await dbQuery<any>('SELECT name, plan FROM securetag.tenant WHERE id=$1', [tenantId]);
      const userContext = {
        organization: tenantInfo.rows[0]?.name || 'Organization',
        name: 'Authorized User', // Placeholder until we have user profile
      };

      // 3. Fetch Data
      const data = await ReportService.getReportData(taskId, userContext);

      // 4. Render Report
      switch (reportType) {
        case 'executive':
        case 'executive.pdf': {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="aegis-executive-${taskId.slice(0,8)}.pdf"`);
          // Use createElement to avoid JSX compilation issues in backend env
          const element = React.createElement(ExecutiveReport, { data }) as any;
          const stream = await renderToStream(element);
          stream.pipe(res);
          break;
        }

        case 'technical':
        case 'technical.pdf': {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="aegis-technical-${taskId.slice(0,8)}.pdf"`);
          
          try {
              const element = React.createElement(TechnicalReport, { data }) as any;
              const stream = await renderToStream(element);
              stream.pipe(res);
              stream.on('error', (err) => console.error('Stream error:', err));
          } catch (renderError: any) {
              console.error('FATAL ERROR rendering Technical Report:', renderError);
              if (renderError.stack) console.error(renderError.stack);
              throw renderError;
          }
          break;
        }

        case 'json': {
          send(res, 200, data);
          break;
        }

        case 'xml': {
          const xmlOptions = { compact: true, ignoreComment: true, spaces: 4 };
          // Wrapper for XML root
          const xmlData = {
            report: {
              _attributes: {
                generatedAt: data.meta.generatedAt.toISOString(),
                scanId: data.meta.scanId
              },
              project: data.project,
              findings: {
                finding: data.findings.map(f => ({
                  _attributes: {
                    id: f.id,
                    severity: f.severity,
                    ruleName: f.ruleName
                  },
                  location: {
                    file: f.filePath,
                    line: f.line
                  },
                  analysis: {
                    reasoning: f.analysis.reasoning
                  }
                }))
              }
            }
          };
          const xmlString = xml.js2xml(xmlData, xmlOptions);
          send(res, 200, xmlString, 'application/xml');
          break;
        }

        default:
          send(res, 400, { ok: false, error: 'Unsupported report type' });
      }

    } catch (e: any) {
      console.error('Report generation error:', e);
      if (e instanceof Error) {
          console.error(e.stack);
      }
      send(res, 500, { ok: false, error: 'Failed to generate report: ' + e.message });
    }
    return true;
  }
  return false;
};
