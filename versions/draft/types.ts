/* eslint-disable */
/**
 * GENERATED — do not edit by hand.
 * Source: ADL spec model (model/adl.ts) -> versions/draft/schema.json
 * Regenerate with: bun run build:types
 */

/**
 * Agent Definition Language v0.3.0
 */
export interface ADLDocument {
  /**
   * ADL specification version (semantic versioning)
   */
  adl_spec: string;
  /**
   * URI to this JSON Schema
   */
  $schema?: string;
  /**
   * Human-readable name for the agent
   */
  name: string;
  /**
   * Human-readable description of the agent's purpose and capabilities
   */
  description: string;
  /**
   * Agent version (semantic versioning)
   */
  version: string;
  lifecycle?: {
    /**
     * Lifecycle state of the agent
     */
    status: 'draft' | 'active' | 'deprecated' | 'retired';
    /**
     * ISO 8601 timestamp when current status took effect
     */
    effective_date?: string;
    /**
     * ISO 8601 timestamp for planned or actual retirement
     */
    sunset_date?: string;
    /**
     * URI or URN of the replacement agent
     */
    successor?: string;
    extensions?: Extensions;
  };
  /**
   * Unique identifier for the agent (URI or URN)
   */
  id?: string;
  /**
   * Organization or entity that provides the agent
   */
  provider?: {
    name: string;
    url?: string;
    contact?: string;
    extensions?: Extensions;
  };
  /**
   * Cryptographic identification for the agent
   */
  cryptographic_identity?: {
    did?: string;
    public_key?: {
      algorithm: string;
      value: string;
      extensions?: Extensions;
    };
    extensions?: Extensions;
  };
  /**
   * AI model configuration
   */
  model?: {
    provider?: string;
    name?: string;
    version?: string;
    context_window?: number;
    temperature?: number;
    max_tokens?: number;
    capabilities?: ('function_calling' | 'vision' | 'code_execution' | 'streaming')[];
    extensions?: Extensions;
  };
  /**
   * System prompt (string or template object)
   */
  system_prompt?:
    | string
    | {
        template: string;
        variables?: {};
        extensions?: Extensions;
      };
  /**
   * Tools (functions) the agent can invoke
   */
  tools?: {
    /**
     * Unique tool name
     */
    name: string;
    description: string;
    /**
     * JSON Schema for tool input parameters
     */
    parameters?: {};
    /**
     * JSON Schema for tool return value
     */
    returns?: {};
    /**
     * Example invocations
     */
    examples?: {
      name?: string;
      input?: {};
      output?: unknown;
      extensions?: Extensions;
    }[];
    requires_confirmation?: boolean;
    idempotent?: boolean;
    read_only?: boolean;
    /**
     * Implementation hints and metadata (open object)
     */
    annotations?: {
      openapi_ref?: string;
      operation_id?: string;
      [k: string]: unknown;
    };
    data_classification?: DataClassification;
    extensions?: Extensions;
  }[];
  /**
   * Data sources the agent can access
   */
  resources?: {
    name: string;
    type: 'vector_store' | 'knowledge_base' | 'file' | 'api' | 'database';
    description?: string;
    uri?: string;
    mime_types?: string[];
    /**
     * JSON Schema describing the resource's data structure
     */
    schema?: {};
    /**
     * Implementation hints and metadata (open object)
     */
    annotations?: {
      [k: string]: unknown;
    };
    data_classification?: DataClassification;
    extensions?: Extensions;
  }[];
  /**
   * Reusable prompt templates
   */
  prompts?: {
    name: string;
    template: string;
    description?: string;
    /**
     * JSON Schema for template arguments
     */
    arguments?: {};
    extensions?: Extensions;
  }[];
  /**
   * Agent operational boundaries (deny-by-default)
   */
  permissions?: {
    network?: {
      /**
       * Host patterns (see Section 4.4)
       */
      allowed_hosts?: string[];
      allowed_ports?: number[];
      allowed_protocols?: string[];
      deny_private?: boolean;
      extensions?: Extensions;
    };
    filesystem?: {
      allowed_paths?: {
        path: string;
        access: 'read' | 'write' | 'read_write';
      }[];
      /**
       * Path patterns to deny (see Section 4.4)
       */
      denied_paths?: string[];
      extensions?: Extensions;
    };
    environment?: {
      /**
       * Variable name patterns (see Section 4.4)
       */
      allowed_variables?: string[];
      /**
       * Variable name patterns to deny (see Section 4.4)
       */
      denied_variables?: string[];
      extensions?: Extensions;
    };
    execution?: {
      allowed_commands?: string[];
      denied_commands?: string[];
      allow_shell?: boolean;
      extensions?: Extensions;
    };
    resource_limits?: {
      max_memory_mb?: number;
      max_cpu_percent?: number;
      max_duration_sec?: number;
      max_concurrent?: number;
      budget?: Budget;
      extensions?: Extensions;
    };
    /**
     * Subordinate personas this agent may spawn under its own identity (no separate passport); capped at spawn by Runtime Protocol §4
     */
    sub_agents?: {
      name: string;
      description?: string;
      prompt_resource?: string;
      tools?: string[];
      max_parallel?: number;
      budget_share?: Budget;
      extensions?: Extensions;
    }[];
    /**
     * Envelope of separately-identified peer agents this agent may engage (admitted by Runtime Protocol §4)
     */
    delegation?: {
      match?: string[];
      deny?: string[];
      max_depth?: number;
      attenuation?: {
        scopes_subset?: boolean;
        budget_subset?: boolean;
        extensions?: Extensions;
      };
      extensions?: Extensions;
    };
    extensions?: Extensions;
  };
  /**
   * Security requirements
   */
  security?: {
    authentication?: {
      type?: 'none' | 'api_key' | 'oauth2' | 'oidc' | 'mtls';
      required?: boolean;
      scopes?: string[];
      token_endpoint?: string;
      issuer?: string;
      audience?: string;
      extensions?: Extensions;
    };
    encryption?: {
      in_transit?: {
        required?: boolean;
        min_version?: string;
        extensions?: Extensions;
      };
      at_rest?: {
        required?: boolean;
        algorithm?: string;
        extensions?: Extensions;
      };
      extensions?: Extensions;
    };
    attestation?: {
      type?: 'self' | 'third_party' | 'verifiable_credential';
      issuer?: string;
      issued_at?: string;
      expires_at?: string;
      signature?: {
        algorithm: string;
        value: string;
        signed_content: 'canonical' | 'digest';
        digest_algorithm?: string;
        digest_value?: string;
        extensions?: Extensions;
      };
      extensions?: Extensions;
    };
    extensions?: Extensions;
  };
  data_classification: DataClassification;
  /**
   * Runtime behavior configuration
   */
  runtime?: {
    input_handling?: {
      max_input_length?: number;
      /**
       * Accepted MIME types (e.g., text/plain, application/json)
       */
      content_types?: string[];
      sanitization?: {
        enabled?: boolean;
        strip_html?: boolean;
        max_input_length?: number;
        extensions?: Extensions;
      };
      extensions?: Extensions;
    };
    output_handling?: {
      max_output_length?: number;
      format?: 'text' | 'json' | 'markdown' | 'html';
      streaming?: boolean;
      extensions?: Extensions;
    };
    tool_invocation?: {
      parallel?: boolean;
      max_concurrent?: number;
      timeout_ms?: number;
      max_iterations?: number;
      max_tool_calls_per_session?: number;
      loop_detection?: {
        window?: number;
        on_detected?: DegradationResponse;
        extensions?: Extensions;
      };
      retry_policy?: {
        max_retries?: number;
        backoff_strategy?: 'fixed' | 'exponential' | 'linear';
        initial_delay_ms?: number;
        max_delay_ms?: number;
        extensions?: Extensions;
      };
      extensions?: Extensions;
    };
    error_handling?: {
      on_tool_error?: 'abort' | 'continue' | 'retry';
      max_retries?: number;
      fallback_behavior?: {
        action?: 'return_error' | 'use_default' | 'skip';
        /**
         * Default value when action is use_default
         */
        default?: {
          [k: string]: unknown;
        };
        message?: string;
        extensions?: Extensions;
      };
      extensions?: Extensions;
    };
    /**
     * Behavior when an operational limit is reached or a fault occurs, keyed by cause (enforced by Runtime Protocol §6)
     */
    degradation?: {
      extensions?: Extensions;
      [k: string]: DegradationResponse;
    };
    extensions?: Extensions;
  };
  /**
   * Additional metadata
   */
  metadata?: {
    authors?: {
      name?: string;
      email?: string;
      url?: string;
      extensions?: Extensions;
    }[];
    license?: string;
    documentation?: string;
    repository?: string;
    tags?: string[];
    extensions?: Extensions;
  };
  /**
   * Profile identifiers (URIs or registered names)
   */
  profiles?: string[];
  extensions?: Extensions;
}
/**
 * Vendor-namespaced extensions. Keys are reverse-domain identifiers.
 */
export interface Extensions {
  /**
   * This interface was referenced by `Extensions`'s JSON-Schema definition
   * via the `patternProperty` "^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$".
   */
  [k: string]: {
    [k: string]: unknown;
  };
}
/**
 * Data classification (composable; profiles MAY add domain-specific sub-objects via schema composition)
 */
export interface DataClassification {
  /**
   * Information sensitivity level (NIST FIPS 199 / ISO 27001)
   */
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  /**
   * Broad information categories handled
   *
   * @minItems 1
   */
  categories?: [
    'pii' | 'phi' | 'financial' | 'credentials' | 'intellectual_property' | 'regulatory',
    ...('pii' | 'phi' | 'financial' | 'credentials' | 'intellectual_property' | 'regulatory')[]
  ];
  /**
   * Data retention requirements
   */
  retention?: {
    min_days?: number;
    max_days?: number;
    policy_uri?: string;
    extensions?: Extensions;
  };
  /**
   * Data handling constraints
   */
  handling?: {
    encryption_required?: boolean;
    anonymization_required?: boolean;
    cross_border_restricted?: boolean;
    logging_required?: boolean;
    extensions?: Extensions;
  };
  extensions?: Extensions;
}
/**
 * Cumulative token / cost / wall-clock budget, scoped per session and per day (enforced by Runtime Protocol §2)
 */
export interface Budget {
  tokens?: BudgetDimension;
  cost_usd?: BudgetDimension;
  wall_clock_sec?: BudgetDimension;
}
/**
 * Per-session / per-day cap for one budget dimension
 */
export interface BudgetDimension {
  per_session?: number;
  per_day?: number;
}
/**
 * Governor response to a degradation cause (Runtime Protocol §6)
 *
 * This interface was referenced by `undefined`'s JSON-Schema definition
 * via the `patternProperty` "^on_[a-z0-9_]+$".
 */
export interface DegradationResponse {
  action: 'halt' | 'pause' | 'fallback' | 'continue';
  /**
   * Value to return when action is fallback
   */
  value?: {
    [k: string]: unknown;
  };
  message?: string;
  notify?: boolean;
  extensions?: Extensions;
}
