import { createSystemClient } from '../securetagClient';
import { HttpError } from 'wasp/server';
import axios from 'axios';
import { calculateScanCost, PLAN_LIMITS } from '../../shared/sastCosts';
import { SubscriptionTier } from '../../payment/plans';

export const getProjects = async (_args: any, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
    return { projects: [], missingKey: true, error: "User not linked to Core" };
  }

  // Use System Client (acting on behalf of user) instead of user's API key
  const client = createSystemClient(context.user.securetagUserId);
  
  try {
    const response = await client.get('/projects');
    const projects = response.data.projects || [];
    
    // console.log(`getProjects: Fetched ${projects.length} projects from Core.`);
    projects.forEach((p: any, i: number) => {
       // console.log(`[Server] Project ${i}: id=${p.id}, name="${p.name}", alias="${p.alias}"`);
    });

    return { 
      projects: projects, 
      missingKey: false,
      ok: response.data.ok 
    };
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // If system client fails, it's a system configuration issue or user link issue
      console.error("getProjects Auth Error:", error.message);
      throw new HttpError(500, "System Authentication Failed");
    }
    console.error("getProjects error:", error.message);
    throw new HttpError(500, `Failed to fetch projects: ${error.message}`);
  }
};

export const getProjectHistory = async (args: { projectId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
    throw new HttpError(400, 'User not linked to Securetag Core');
  }

  const client = createSystemClient(context.user.securetagUserId);
  try {
    // The endpoint according to docs is GET /projects/:alias/history
    // console.log(`getProjectHistory: Fetching history for project ${args.projectId}`);
    const response = await client.get(`/projects/${args.projectId}/history`);
    
    // DEBUG: Log the first history item to understand the structure of custom_rules
    // if (response.data.history && response.data.history.length > 0) {
    //    console.log("DEBUG HISTORY ITEM:", JSON.stringify(response.data.history[0], null, 2));
    // }

    // console.log("getProjectHistory response data keys:", Object.keys(response.data));
    return response.data;
  } catch (error: any) {
    console.error("getProjectHistory error:", error.message);
    if (error.response?.status === 404) {
      console.error(`getProjectHistory 404: Project ${args.projectId} not found at /projects/${args.projectId}/history`);
      throw new HttpError(404, 'Project not found');
    }
    throw new HttpError(500, `Failed to fetch project history: ${error.message}`);
  }
};

export const getProjectVulnerabilities = async (args: { projectId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
    throw new HttpError(400, 'User not linked to Securetag Core');
  }

  const client = createSystemClient(context.user.securetagUserId);
  try {
    const response = await client.get(`/projects/${args.projectId}/vulnerabilities`);
    return response.data;
  } catch (error: any) {
    console.error("getProjectVulnerabilities error:", error.message);
    if (error.response?.status === 404) {
      // If no vulnerabilities found or project not found, return empty list gracefully?
      // Or propagate 404 if project invalid.
      // For now, assume empty if 404 on vulnerabilities endpoint (though endpoint returns {vulnerabilities: []} usually)
      return { ok: true, vulnerabilities: [] };
    }
    throw new HttpError(500, `Failed to fetch project vulnerabilities: ${error.message}`);
  }
};

export const createScan = async (args: { 
  projectName: string, 
  fileName: string, 
  fileContent: string,
  profile?: string,
  customRules?: boolean,
  customRulesQty?: string,
  customRulesModel?: string,
  doubleCheck?: string,
  doubleCheckLevel?: string
}, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
     throw new HttpError(400, 'User not linked to Securetag Core');
  }

  // ==============================================================================
  // 1. BUSINESS LOGIC VALIDATION (Credit Economy & Tier Enforcement)
  // ==============================================================================
  
  const userTier = (context.user.subscriptionTier as SubscriptionTier) || SubscriptionTier.FREE;
  const limits = PLAN_LIMITS[userTier];

  // A. Validate File Size (Estimación base64: size * 0.75 aprox)
  const estimatedSizeMb = (args.fileContent.length * 0.75) / (1024 * 1024);
  if (estimatedSizeMb > limits.maxFileSizeMb) {
     throw new HttpError(400, `File size (${estimatedSizeMb.toFixed(2)}MB) exceeds plan limit of ${limits.maxFileSizeMb}MB.`);
  }

  // B. Validate Capabilities (Custom Rules)
  if (args.customRules) {
      if (!limits.features.customRules) {
          throw new HttpError(403, `Custom Rules are not available on the ${userTier} plan.`);
      }
      
      const requestedModel = args.customRulesModel || 'standard';
      if (!limits.allowedModels.includes(requestedModel)) {
          throw new HttpError(403, `Model '${requestedModel}' is not allowed on the ${userTier} plan.`);
      }
  }

  // C. Validate Credits (Worst-Case Scenario)
  const costEstimation = calculateScanCost({
      doubleCheckLevel: args.doubleCheckLevel,
      customRules: args.customRules,
      customRulesQty: args.customRulesQty ? parseInt(args.customRulesQty) : 0,
      customRulesModel: args.customRulesModel
  });
  
  if (context.user.credits < costEstimation.total) {
      throw new HttpError(402, `Insufficient credits. Required: ${costEstimation.total}, Available: ${context.user.credits}.`);
  }

  // ==============================================================================

  // We use Axios directly because we need to handle FormData and System Headers manually
  // createSystemClient sets JSON content-type by default, which conflicts with FormData
  
  try {
    const buffer = Buffer.from(args.fileContent, 'base64');
    
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'application/zip' });
    formData.append('file', blob, args.fileName);
    
    if (args.projectName) {
      formData.append('project_alias', args.projectName);
    }
    
    // Advanced Options
    if (args.profile) {
      formData.append('profile', args.profile);
    }
    if (args.customRules !== undefined) {
      formData.append('custom_rules', String(args.customRules));
    }
    if (args.customRulesQty) {
      formData.append('custom_rules_qty', args.customRulesQty);
    }
    if (args.customRulesModel) {
      formData.append('custom_rule_model', args.customRulesModel);
    }
    if (args.doubleCheck) {
      formData.append('double_check', args.doubleCheck);
    }
    if (args.doubleCheckLevel) {
      formData.append('double_check_level', args.doubleCheckLevel);
    }

    const response = await axios.post(
      `${process.env.SECURETAG_API_URL}/codeaudit/upload`,
      formData,
      {
        headers: {
          'X-SecureTag-System-Secret': process.env.SECURETAG_SYSTEM_SECRET || '',
          'X-SecureTag-User-Id': context.user.securetagUserId,
          'Host': process.env.SECURETAG_API_HOST || 'api.securetag.com.mx',
        },
        timeout: 60000, // 60s timeout for uploads
      }
    );
    
    // Deduct credits after successful scan creation
    await context.entities.User.update({
        where: { id: context.user.id },
        data: { credits: { decrement: costEstimation.total } }
    });

    // Record Credit Usage
    try {
        await context.entities.CreditUsage.create({
            data: {
                amount: -costEstimation.total,
                type: 'SCAN',
                description: `SAST Scan: ${args.projectName || 'Unnamed Project'}`,
                metadata: {
                    breakdown: costEstimation.breakdown,
                    fileName: args.fileName,
                    scanProfile: args.profile,
                    taskId: response.data.task_id
                },
                userId: context.user.id,
                relatedObjectId: response.data.task_id || null
            }
        });
    } catch (logError) {
        console.error("Failed to log CreditUsage:", logError);
        // Non-blocking error
    }
    
    // Log the deduction for audit purposes (and to match with the settlement logic later)
    console.log(`[createScan] Deducted ${costEstimation.total} credits (HOLD) from user ${context.user.id}.`);
    if (costEstimation.breakdown.customRules) {
        console.log(`[createScan] Custom Rules Hold: ${JSON.stringify(costEstimation.breakdown.customRules)}`);
    }

    return response.data;
  } catch (error: any) {
    console.error("createScan error:", error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(error.response.data));
      if (error.response.status === 400) {
        throw new HttpError(400, `Bad Request: ${JSON.stringify(error.response.data)}`);
      }
      if (error.response.status === 401) {
         throw new HttpError(500, 'System Auth Error during Scan');
      }
    }
    throw new HttpError(500, `Failed to create scan: ${error.message}`);
  }
};

export const getSastDashboard = async (_args: any, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
    // Return empty state but not error, so UI renders "Contact Support" or similar if needed
    return {
        stats: { credits: 0, activeScans: 0, totalVulns: 0, totalProjects: 0 },
        severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        recentScans: [],
        missingKey: false // Now false because key is not required
    };
  }

  const client = createSystemClient(context.user.securetagUserId);

  try {
    // Call the new centralized endpoint in the Core Backend
    const response = await client.get('/dashboard/stats');
    
    // Auto-sync Credits Logic
    const backendCredits = response.data.stats?.credits;
    const localCredits = context.user.credits;
    
    if (typeof backendCredits === 'number' && backendCredits !== localCredits) {
       console.log(`Credit mismatch detected (Local: ${localCredits}, Backend: ${backendCredits}). Syncing FROM Backend...`);
       try {
             const diff = backendCredits - localCredits;
             
             // Si el backend tiene más créditos, es un Reembolso o Abono externo
             if (diff > 0) {
                 await context.entities.CreditUsage.create({
                    data: {
                        amount: diff,
                        type: 'REFUND', // Asumimos reembolso por defecto en este flujo de sync
                        description: 'Ajuste de sistema / Reembolso automático',
                        userId: context.user.id
                    }
                 });
             }
             // Si el backend tiene MENOS créditos, es un consumo que no se registró localmente (raro, pero posible)
             else if (diff < 0) {
                 await context.entities.CreditUsage.create({
                    data: {
                        amount: diff,
                        type: 'ADJUSTMENT',
                        description: 'Ajuste de sincronización con Core',
                        userId: context.user.id
                    }
                 });
             }

             // UPDATE LOCAL DB with Backend Value (Source of Truth)
             await context.entities.User.update({
                where: { id: context.user.id },
                data: { credits: backendCredits }
             });
             
             // Update the response to match the synced value
             if (response.data.stats) {
                 response.data.stats.credits = backendCredits;
             }
             console.log(`Credits synced successfully. Local updated to ${backendCredits}.`);
       } catch (syncError: any) {
          console.error('Auto-sync failed:', syncError.message);
          // Continue without failing the dashboard load
       }
    }
    
    return {
      ...response.data,
      missingKey: false
    };

  } catch (error: any) {
    console.error("getSastDashboard error:", error.message);
    throw new HttpError(500, `Failed to load dashboard data: ${error.message}`);
  }
};

export const getScanResults = async (args: { taskId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
    throw new HttpError(400, 'User not linked to Securetag Core');
  }

  const client = createSystemClient(context.user.securetagUserId);
  try {
    const url = `/codeaudit/${args.taskId}`;
    console.log(`getScanResults: Fetching scan results from ${url}`);
    
    const response = await client.get(url);
    return response.data;
  } catch (error: any) {
    console.error(`getScanResults error for Task ${args.taskId}:`, error.message);
    if (error.response) {
       console.error(`getScanResults Status: ${error.response.status}`);
       console.error(`getScanResults Data:`, JSON.stringify(error.response.data));
    }

    if (error.response?.status === 404) {
      throw new HttpError(404, 'Scan not found');
    }
    throw new HttpError(500, `Failed to fetch scan results: ${error.message}`);
  }
};

export const runDoubleCheck = async (args: { findingIds: string[], model?: string, projectName?: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
    throw new HttpError(400, 'User not linked to Securetag Core');
  }

  const client = createSystemClient(context.user.securetagUserId);
  const successfulIds: string[] = [];
  const model = args.model || 'standard';
  
  let costPerFinding = 1;
  if (model === 'pro') costPerFinding = 2;
  if (model === 'max') costPerFinding = 3;
  
  // Validate credits locally first (Optimistic check)
  const totalCost = args.findingIds.length * costPerFinding;
  if (context.user.credits < totalCost) {
      throw new HttpError(402, `Insufficient credits. Required: ${totalCost}, Available: ${context.user.credits}`);
  }

  console.log(`[runDoubleCheck] Starting for ${args.findingIds.length} findings. Model: ${model}. Est Cost: ${totalCost}`);

  // Iterate and call Core API
  // We loop sequentially to ensure reliability and handle partial failures
  for (const id of args.findingIds) {
      try {
          await client.post('/api/v1/findings/double-check', {
              finding_id: id,
              model: model
          });
          successfulIds.push(id);
      } catch (e: any) {
          console.error(`Double check failed for ${id}:`, e.message);
          if (e.response?.status === 402) {
             // Stop if we run out of credits mid-way (shouldn't happen due to check above, but sync issues possible)
             break;
          }
      }
  }

  // Deduct credits for successful ones locally to keep sync with Core
  const actualCost = successfulIds.length * costPerFinding;
  if (actualCost > 0) {
      await context.entities.User.update({
          where: { id: context.user.id },
          data: { credits: { decrement: actualCost } }
      });
      console.log(`[runDoubleCheck] Deducted ${actualCost} credits locally.`);

      // Record Credit Usage
      try {
          await context.entities.CreditUsage.create({
              data: {
                  amount: -actualCost,
                  type: 'DOUBLE_CHECK',
                  description: `Double Check: ${args.projectName || 'Unknown Project'}`,
                  metadata: {
                      type: 'double_check',
                      model: model,
                      qty: successfulIds.length,
                      breakdown: {
                          doubleCheck: {
                              level: model,
                              cost: actualCost,
                              qty: successfulIds.length
                          }
                      }
                  },
                  userId: context.user.id,
                  relatedObjectId: null
              }
          });
      } catch (logError) {
          console.error("Failed to log CreditUsage for Double Check:", logError);
          // Non-blocking error
      }
  }

  return { successfulIds, total: successfulIds.length };
};

export const generateReport = async (args: { taskId: string, type: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
    throw new HttpError(400, 'User not linked to Securetag Core');
  }

  const client = createSystemClient(context.user.securetagUserId);
  try {
    const response = await client.get(`/reports/${args.taskId}/${args.type}`, {
      responseType: 'arraybuffer'
    });
    
    // Determine content type based on extension/type
    let contentType = 'application/json';
    let extension = 'json';
    
    if (args.type.includes('pdf') || args.type === 'executive' || args.type === 'technical') {
      contentType = 'application/pdf';
      extension = 'pdf';
    } else if (args.type === 'xml') {
      contentType = 'application/xml';
      extension = 'xml';
    }

    const filename = `securetag-report-${args.taskId.slice(0, 8)}.${extension}`;
    const base64 = Buffer.from(response.data, 'binary').toString('base64');

    return {
      data: base64,
      filename,
      contentType
    };

  } catch (error: any) {
    console.error("generateReport error:", error.message);
    if (error.response?.status === 404) {
      throw new HttpError(404, 'Report or Task not found');
    }
    throw new HttpError(500, `Failed to generate report: ${error.message}`);
  }
};

export const getGlobalReport = async (args: { projectId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!context.user.securetagUserId) {
    throw new HttpError(400, 'User not linked to Securetag Core');
  }

  const client = createSystemClient(context.user.securetagUserId);
  try {
    const response = await client.get(`/reports/project/${args.projectId}/global`, {
      responseType: 'arraybuffer'
    });
    
    const filename = `securetag-global-report-${args.projectId.slice(0, 8)}.pdf`;
    const base64 = Buffer.from(response.data, 'binary').toString('base64');

    return {
      data: base64,
      filename,
      contentType: 'application/pdf'
    };

  } catch (error: any) {
    console.error("getGlobalReport error:", error.message);
    if (error.response?.status === 404) {
      throw new HttpError(404, 'Project not found');
    }
    throw new HttpError(500, `Failed to generate global report: ${error.message}`);
  }
};
