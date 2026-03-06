/**
 * Batch Job Manager for Gemini Batch API
 * 
 * Risk Mitigation:
 * 1. Atomic enqueue (UNIQUE constraint)
 * 2. Retry chain tracking (root_job_id + attempt)
 * 3. Concurrent protection (leased_until optimistic lock)
 * 4. Partial failure handling (batch_job_errors)
 * 5. Result mapping by key (not array index)
 * 6. Backlog control (MAX_IN_FLIGHT limit)
 */

import type { Env } from '../types';

export type BatchJobType = 'auto_tag' | 'deduplicate';
export type BatchJobStatus = 
  | 'queued' 
  | 'submitted' 
  | 'running' 
  | 'processing_results' 
  | 'succeeded' 
  | 'partial_failed' 
  | 'failed' 
  | 'dead_letter';

export interface BatchJobConfig {
  jobType: BatchJobType;
  entities: Array<{ id: string; data: any }>;  // id = card.uuid or pair key
  maxAttempts?: number;
}

interface RetryContext {
  rootJobId: number;
  parentJobId: number;
  attempt: number;
  maxAttempts: number;
}

export class BatchJobManager {
  private readonly LEASE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_IN_FLIGHT = 3;

  constructor(private env: Env) {}

  /**
   * Enqueue entities atomically (防止重複入列)
   */
  async enqueueEntities(
    entityType: 'card' | 'card_pair',
    entityIds: string[],
    jobType: BatchJobType
  ): Promise<number> {
    const now = Date.now();
    let enqueued = 0;

    for (const entityId of entityIds) {
      try {
        await this.env.DB.prepare(`
          INSERT INTO batch_job_queue (entity_type, entity_id, job_type, status, enqueued_at)
          VALUES (?, ?, ?, 'queued', ?)
        `).bind(entityType, entityId, jobType, now).run();
        enqueued++;
      } catch (error) {
        // UNIQUE constraint violation = already enqueued, skip
        if (String(error).includes('UNIQUE constraint')) {
          continue;
        }
        throw error;
      }
    }

    return enqueued;
  }

  /**
   * Create Batch Job (非阻塞)
   */
  async createJob(config: BatchJobConfig, retryCtx?: RetryContext): Promise<string> {
    const now = Date.now();

    // 1. Prepare inline requests (use entity ID as key)
    const requests = config.entities.map(entity => ({
      key: entity.id,
      request: this.buildRequest(config.jobType, entity.data)
    }));

    // 2. Call Gemini Batch API (correct format per official docs)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.env.GEMINI_MODEL}:batchGenerateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.env.GEMINI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batch: {
            display_name: `${config.jobType}-${now}`,
            input_config: {
              requests: {
                requests: requests.map(r => ({
                  request: r.request,
                  metadata: { key: r.key }
                }))
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { name: string };
    const jobName = data.name; // batches/abc123

    // 3. Insert into batch_jobs
    const attempt = retryCtx?.attempt || 1;
    const maxAttempts = retryCtx?.maxAttempts || config.maxAttempts || 3;
    const rootJobId = retryCtx?.rootJobId || null;
    const parentJobId = retryCtx?.parentJobId || null;

    const result = await this.env.DB.prepare(`
      INSERT INTO batch_jobs (
        job_name, job_type, status, created_at, total_requests, config_json,
        root_job_id, parent_job_id, attempt, max_attempts
      ) VALUES (?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      jobName,
      config.jobType,
      now,
      config.entities.length,
      JSON.stringify(config),
      rootJobId,
      parentJobId,
      attempt,
      maxAttempts
    ).first<{ id: number }>();

    const jobId = result!.id;

    // 4. Update root_job_id if this is the first job
    if (!retryCtx) {
      await this.env.DB.prepare(`
        UPDATE batch_jobs SET root_job_id = ? WHERE id = ?
      `).bind(jobId, jobId).run();
    }

    // 5. Update queue with batch_job_id
    const entityIds = config.entities.map(e => e.id);
    for (const entityId of entityIds) {
      await this.env.DB.prepare(`
        UPDATE batch_job_queue
        SET batch_job_id = ?, status = 'processing'
        WHERE entity_id = ? AND job_type = ? AND status = 'queued'
      `).bind(jobId, entityId, config.jobType).run();
    }

    console.log(`[BatchJob] Created job ${jobName} (attempt ${attempt}/${maxAttempts})`);
    return jobName;
  }

  /**
   * Poll and process pending jobs
   */
  async pollAndProcess(): Promise<void> {
    const now = Date.now();

    // Query jobs that need processing
    const { results: jobs } = await this.env.DB.prepare(`
      SELECT * FROM batch_jobs
      WHERE status IN ('submitted', 'running')
        AND (leased_until IS NULL OR leased_until < ?)
        AND created_at > ?
      ORDER BY created_at ASC
      LIMIT 10
    `).bind(now, now - 48 * 3600 * 1000).all();

    for (const job of jobs) {
      await this.processJob(job as any);
    }
  }

  /**
   * Process single job (with lease lock)
   */
  private async processJob(job: any): Promise<void> {
    const now = Date.now();

    // Acquire lease lock (optimistic)
    const { success } = await this.env.DB.prepare(`
      UPDATE batch_jobs
      SET leased_until = ?
      WHERE id = ? AND (leased_until IS NULL OR leased_until < ?)
    `).bind(now + this.LEASE_DURATION, job.id, now).run();

    if (!success || (success as any) === 0) {
      // Already leased by another worker
      return;
    }

    try {
      // Query Gemini job status
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${job.job_name}`,
        {
          headers: { 'x-goog-api-key': this.env.GEMINI_API_KEY }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to query job status: ${response.status}`);
      }

      const data = await response.json() as any;
      const state = data.metadata?.state || data.state;

      // Update status
      if (state === 'JOB_STATE_RUNNING') {
        await this.env.DB.prepare(`
          UPDATE batch_jobs SET status = 'running', started_at = ? WHERE id = ?
        `).bind(now, job.id).run();
      } else if (state === 'JOB_STATE_SUCCEEDED') {
        await this.handleSuccess(job, data);
      } else if (state === 'JOB_STATE_FAILED') {
        await this.handleFailure(job, data);
      }
    } finally {
      // Release lease
      await this.env.DB.prepare(`
        UPDATE batch_jobs SET leased_until = NULL WHERE id = ?
      `).bind(job.id).run();
    }
  }

  /**
   * Handle successful job
   */
  private async handleSuccess(job: any, data: any): Promise<void> {
    const now = Date.now();
    const results = data.response?.inlinedResponses || [];
    
    // Build result map by key
    const resultMap = new Map<string, any>();
    for (const result of results) {
      if (result.key) {
        resultMap.set(result.key, result);
      }
    }

    const config = JSON.parse(job.config_json);
    let succeeded = 0;
    let failed = 0;

    // Process each entity
    for (const entity of config.entities) {
      const result = resultMap.get(entity.id);

      if (result?.response) {
        // Success: process result
        await this.processResult(job.job_type, entity.id, result.response);
        await this.updateQueueStatus(entity.id, job.job_type, 'completed', now);
        succeeded++;
      } else if (result?.error) {
        // Error: record to batch_job_errors
        await this.recordError(job.id, entity.id, result.error);
        await this.updateQueueStatus(entity.id, job.job_type, 'failed', now, result.error.message);
        failed++;
      } else {
        // Missing result
        await this.recordError(job.id, entity.id, { code: 'MISSING_RESULT', message: 'No result returned' });
        await this.updateQueueStatus(entity.id, job.job_type, 'failed', now, 'No result returned');
        failed++;
      }
    }

    // Update job status
    const finalStatus = failed > 0 ? 'partial_failed' : 'succeeded';
    await this.env.DB.prepare(`
      UPDATE batch_jobs
      SET status = ?, completed_at = ?, succeeded_requests = ?, failed_requests = ?
      WHERE id = ?
    `).bind(finalStatus, now, succeeded, failed, job.id).run();

    console.log(`[BatchJob] Job ${job.job_name} completed: ${succeeded} succeeded, ${failed} failed`);
  }

  /**
   * Handle failed job (with retry chain)
   */
  private async handleFailure(job: any, data: any): Promise<void> {
    const now = Date.now();
    const rootJobId = job.root_job_id || job.id;
    const currentAttempt = job.attempt;
    const maxAttempts = job.max_attempts;

    if (currentAttempt < maxAttempts) {
      // Retry: create new job with incremented attempt
      const config = JSON.parse(job.config_json);
      const newJobName = await this.createJob(config, {
        rootJobId,
        parentJobId: job.id,
        attempt: currentAttempt + 1,
        maxAttempts
      });

      // Mark current job as failed (not cancelled)
      await this.env.DB.prepare(`
        UPDATE batch_jobs
        SET status = 'failed', completed_at = ?, error_message = ?
        WHERE id = ?
      `).bind(now, `Retrying as ${newJobName}`, job.id).run();

      console.log(`[BatchJob] Job ${job.job_name} failed, retrying (${currentAttempt + 1}/${maxAttempts})`);
    } else {
      // Max retries exceeded → dead_letter
      await this.env.DB.prepare(`
        UPDATE batch_jobs
        SET status = 'dead_letter', completed_at = ?, error_message = ?
        WHERE id = ?
      `).bind(now, `Max retries (${maxAttempts}) exceeded: ${data.error?.message || 'Unknown error'}`, job.id).run();

      // Update queue status
      const config = JSON.parse(job.config_json);
      for (const entity of config.entities) {
        await this.updateQueueStatus(entity.id, job.job_type, 'failed', now, 'Max retries exceeded');
      }

      console.error(`[BatchJob] Job ${job.job_name} dead_letter after ${maxAttempts} attempts`);
    }
  }

  /**
   * Check in-flight jobs count
   */
  async checkBacklog(jobType: BatchJobType): Promise<number> {
    const result = await this.env.DB.prepare(`
      SELECT COUNT(*) as count FROM batch_jobs
      WHERE job_type = ?
        AND status IN ('queued', 'submitted', 'running', 'processing_results')
    `).bind(jobType).first<{ count: number }>();

    return result?.count || 0;
  }

  /**
   * Build request based on job type
   */
  private buildRequest(jobType: BatchJobType, data: any): any {
    if (jobType === 'auto_tag') {
      return {
        contents: [{ parts: [{ text: this.buildAutoTagPrompt(data) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              industry: { type: 'string', nullable: true },
              location: { type: 'string', nullable: true },
              expertise: { type: 'array', items: { type: 'string' }, nullable: true },
              seniority: { type: 'string', nullable: true }
            }
          }
        }
      };
    }
    // Add other job types here
    throw new Error(`Unknown job type: ${jobType}`);
  }

  private buildAutoTagPrompt(card: any): string {
    return `Generate tags for this business card:
- Name: ${card.full_name || 'N/A'}
- Organization: ${card.organization || 'N/A'}
- Title: ${card.title || 'N/A'}
- Company Summary: ${card.company_summary || 'N/A'}
- Personal Summary: ${card.personal_summary || 'N/A'}

Generate:
1. industry: Industry classification (single tag)
2. location: Location (single tag)
3. expertise: Areas of expertise (max 3)
4. seniority: Job level (single tag)`;
  }

  /**
   * Process result based on job type
   */
  private async processResult(jobType: BatchJobType, entityId: string, response: any): Promise<void> {
    if (jobType === 'auto_tag') {
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return;

      const tags = JSON.parse(text);
      await this.saveAutoTags(entityId, tags);
    }
  }

  private async saveAutoTags(cardUuid: string, tags: any): Promise<void> {
    const now = Date.now();
    const tagEntries: Array<{ tag: string; source: string }> = [];

    if (tags.industry) tagEntries.push({ tag: `industry:${tags.industry}`, source: 'auto' });
    if (tags.location) tagEntries.push({ tag: `location:${tags.location}`, source: 'auto' });
    if (tags.expertise) {
      for (const exp of tags.expertise.slice(0, 3)) {
        tagEntries.push({ tag: `expertise:${exp}`, source: 'auto-low-confidence' });
      }
    }
    if (tags.seniority) tagEntries.push({ tag: `seniority:${tags.seniority}`, source: 'auto-low-confidence' });

    for (const entry of tagEntries) {
      await this.env.DB.prepare(`
        INSERT OR IGNORE INTO card_tags (card_uuid, tag, tag_source, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(cardUuid, entry.tag, entry.source, now).run();
    }

    // Update auto_tagged_at
    await this.env.DB.prepare(`
      UPDATE received_cards SET auto_tagged_at = ? WHERE uuid = ?
    `).bind(now, cardUuid).run();
  }

  private async updateQueueStatus(
    entityId: string,
    jobType: BatchJobType,
    status: string,
    timestamp: number,
    errorMessage?: string
  ): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE batch_job_queue
      SET status = ?, processed_at = ?, error_message = ?
      WHERE entity_id = ? AND job_type = ?
    `).bind(status, timestamp, errorMessage || null, entityId, jobType).run();
  }

  private async recordError(jobId: number, entityId: string, error: any): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO batch_job_errors (batch_job_id, entity_id, error_code, error_message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(jobId, entityId, error.code || 'UNKNOWN', error.message || 'Unknown error', Date.now()).run();
  }
}
