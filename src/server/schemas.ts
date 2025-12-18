import { z } from 'zod';

/**
 * Validation schema for user provided context
 * Allows users to provide structured context about their project
 */
export const UserContextSchema = z.object({
  project_type: z.enum(["web_api", "cli_tool", "mobile_backend", "desktop_app", "smart_contract"]).optional(),
  data_sensitivity: z.enum(["public", "internal", "confidential", "restricted", "pci_dss", "hipaa"]).optional(),
  exposure: z.enum(["internet_facing", "internal_network", "air_gapped"]).optional(),
  auth_mechanism: z.array(z.enum(["oauth2", "jwt", "session", "api_key", "none"])).optional(),
  description: z.string().max(500, "Description is too long (max 500 chars)").optional(),
  
  // Double Check preferences within UserContext (Optional override/hint)
  double_check_preference: z.object({
      enabled: z.boolean().optional(),
      level: z.enum(["standard", "pro", "max"]).optional(),
      scope: z.enum(["critical", "high", "all"]).optional()
  }).optional()
});

/**
 * Validation schema for file upload metadata
 * Enforces strict security rules to prevent injection and path traversal
 */
export const UploadMetadataSchema = z.object({
  project_alias: z
    .string()
    .min(3, 'Project alias must be at least 3 characters')
    .max(50, 'Project alias must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Project alias must only contain alphanumeric characters, underscores, and hyphens')
    .optional(),
  
  profile: z
    .string()
    .min(3, 'Profile name must be at least 3 characters')
    .max(20, 'Profile name must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9-]+$/, 'Profile name must only contain alphanumeric characters and hyphens')
    .optional(),
    
  user_context: UserContextSchema.optional(),

  double_check: z.enum(["critical", "high", "all", "true", "false", "1", "0"]).optional().default("false"),
  double_check_level: z.enum(["standard", "pro", "max"]).optional().default("standard"),
  
  // Custom Rules Engine Configuration
  custom_rules: z.enum(["true", "false", "1", "0"]).optional().default("false"),
  custom_rules_qty: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(10)).optional().default(3),
  custom_rule_model: z.enum(['standard', 'pro', 'max']).optional()
});

export type UploadMetadata = z.infer<typeof UploadMetadataSchema>;
export type UserContext = z.infer<typeof UserContextSchema>;
