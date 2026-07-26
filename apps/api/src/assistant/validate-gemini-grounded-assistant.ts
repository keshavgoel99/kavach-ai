import assert from 'node:assert/strict';

import {
  getGeminiGroundedAssistantService,
} from './gemini-grounded-assistant-service';

import {
  getIntelligenceAssistantService,
} from './intelligence-assistant-service';

async function main(): Promise<void> {
  const geminiService =
    getGeminiGroundedAssistantService();

  const status =
    geminiService.getStatus();

  assert.equal(
    status.configured,
    true,

    [
      'GEMINI_API_KEY or',
      'GOOGLE_API_KEY must be',
      'configured before this test.',
    ].join(' '),
  );

  const localService =
    await getIntelligenceAssistantService();

  const statistics =
    localService.getStatistics();

  const response =
    await geminiService.query({
      query: [
        'Summarize the FIR identified',
        'by Crime No.',
        statistics
          .sampleCrimeNumber,
      ].join(' '),

      limit:
        5,

      minimumScore:
        0,
    });

  assert.equal(
    response.provider,
    'GEMINI',

    [
      'Gemini was not used.',
      'Check API key, quota, model',
      'availability and grounding',
      'validation logs.',
    ].join(' '),
  );

  assert.equal(
    response
      .generationMode,

    'GEMINI_GROUNDED',
  );

  assert.equal(
    response.fallbackUsed,
    false,
  );

  assert.ok(
    response.answer.length >
      0,
  );

  assert.ok(
    response
      .citationCaseIds
      .length > 0,
  );

  const allowedCaseIds =
    new Set(
      response.sources.map(
        (source) =>
          source.caseId,
      ),
    );

  response
    .citationCaseIds
    .forEach(
      (caseId) => {
        assert.equal(
          allowedCaseIds.has(
            caseId,
          ),
          true,
        );
      },
    );

  console.log('');

  console.log(
    'KAVACH GEMINI RAG · VALID',
  );

  console.log(
    `Model: ${response.model}`,
  );

  console.log(
    [
      'Retrieved sources:',
      response
        .returnedSourceCount,
    ].join(' '),
  );

  console.log(
    [
      'Validated citations:',
      response
        .citationCaseIds
        .join(', '),
    ].join(' '),
  );

  console.log('');

  console.log(
    response.answer,
  );
}

main().catch(
  (error: unknown) => {
    console.error('');

    console.error(
      'KAVACH GEMINI RAG · INVALID',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
