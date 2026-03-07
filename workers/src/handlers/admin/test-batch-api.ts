/**
 * Manual Test Script for Batch API Migration
 * 
 * Usage:
 *   npx wrangler dev
 *   curl http://localhost:8787/api/admin/test-batch-api -H "Authorization: Bearer YOUR_SETUP_TOKEN"
 */

import type { Env } from '../../types';
import { BatchJobManager } from '../../utils/batch-manager';
import { jsonResponse, errorResponse } from '../../utils/response';

export async function handleTestBatchAPI(request: Request, env: Env): Promise<Response> {
  const testResults: any[] = [];

  try {
    const manager = new BatchJobManager(env);

    // Test 1: Enqueue entities (atomic)
    console.log('[Test 1] Enqueue entities...');
    const testCards = ['test-card-1', 'test-card-2', 'test-card-3'];
    const enqueued = await manager.enqueueEntities('card', testCards, 'auto_tag');
    testResults.push({
      test: 'Enqueue entities',
      status: enqueued === 3 ? 'PASS' : 'FAIL',
      expected: 3,
      actual: enqueued
    });

    // Test 2: Duplicate enqueue (should fail)
    console.log('[Test 2] Duplicate enqueue...');
    const duplicateEnqueued = await manager.enqueueEntities('card', testCards, 'auto_tag');
    testResults.push({
      test: 'Prevent duplicate enqueue',
      status: duplicateEnqueued === 0 ? 'PASS' : 'FAIL',
      expected: 0,
      actual: duplicateEnqueued
    });

    // Test 3: Check backlog
    console.log('[Test 3] Check backlog...');
    const backlog = await manager.checkBacklog('auto_tag');
    testResults.push({
      test: 'Check backlog',
      status: backlog >= 0 ? 'PASS' : 'FAIL',
      expected: '>=0',
      actual: backlog
    });

    // Test 4: Query queue status
    console.log('[Test 4] Query queue status...');
    const { results: queueItems } = await env.DB.prepare(`
      SELECT * FROM batch_job_queue WHERE entity_id IN (?, ?, ?)
    `).bind('test-card-1', 'test-card-2', 'test-card-3').all();
    testResults.push({
      test: 'Queue items created',
      status: queueItems.length === 3 ? 'PASS' : 'FAIL',
      expected: 3,
      actual: queueItems.length,
      data: queueItems
    });

    // Test 5: Create batch job (mock data)
    console.log('[Test 5] Create batch job...');
    const mockEntities = [
      {
        id: 'test-card-1',
        data: {
          uuid: 'test-card-1',
          full_name: 'Test User 1',
          organization: 'Test Company',
          title: 'Engineer',
          company_summary: 'A test company',
          personal_summary: 'A test user'
        }
      },
      {
        id: 'test-card-2',
        data: {
          uuid: 'test-card-2',
          full_name: 'Test User 2',
          organization: 'Test Company',
          title: 'Manager',
          company_summary: 'A test company',
          personal_summary: 'A test manager'
        }
      }
    ];

    let jobName = '';
    try {
      jobName = await manager.createJob({
        jobType: 'auto_tag',
        entities: mockEntities,
        maxAttempts: 3
      });
      testResults.push({
        test: 'Create batch job',
        status: jobName.startsWith('batches/') ? 'PASS' : 'FAIL',
        expected: 'batches/*',
        actual: jobName
      });
    } catch (error) {
      testResults.push({
        test: 'Create batch job',
        status: 'FAIL',
        error: String(error)
      });
    }

    // Test 6: Query batch_jobs table
    console.log('[Test 6] Query batch_jobs...');
    const { results: jobs } = await env.DB.prepare(`
      SELECT * FROM batch_jobs ORDER BY created_at DESC LIMIT 5
    `).all();
    testResults.push({
      test: 'Batch jobs table',
      status: jobs.length > 0 ? 'PASS' : 'FAIL',
      expected: '>0',
      actual: jobs.length,
      data: jobs
    });

    // Test 7: Verify root_job_id
    if (jobs.length > 0) {
      const job = jobs[0] as any;
      testResults.push({
        test: 'Root job ID self-reference',
        status: job.root_job_id === job.id ? 'PASS' : 'FAIL',
        expected: job.id,
        actual: job.root_job_id
      });
    }

    // Test 8: Poll and process (dry run)
    console.log('[Test 8] Poll and process...');
    try {
      await manager.pollAndProcess();
      testResults.push({
        test: 'Poll and process',
        status: 'PASS',
        note: 'No errors thrown'
      });
    } catch (error) {
      testResults.push({
        test: 'Poll and process',
        status: 'FAIL',
        error: String(error)
      });
    }

    // Cleanup: Delete test data
    console.log('[Cleanup] Deleting test data...');
    await env.DB.prepare(`
      DELETE FROM batch_job_queue WHERE entity_id LIKE 'test-card-%'
    `).run();
    await env.DB.prepare(`
      DELETE FROM batch_jobs WHERE job_type = 'auto_tag' AND config_json LIKE '%test-card-%'
    `).run();

    return jsonResponse({
      success: true,
      summary: {
        total: testResults.length,
        passed: testResults.filter(t => t.status === 'PASS').length,
        failed: testResults.filter(t => t.status === 'FAIL').length
      },
      tests: testResults
    });

  } catch (error) {
    return errorResponse('TEST_ERROR', String(error), 500);
  }
}
