import { Router } from 'express';
import {
  closeCallSchema,
  createCallSchema,
  idParamSchema,
  listCallsSchema,
  upsertStageSchema,
} from '../schemas/call.js';
import { callsService } from '../services/callsService.js';
import { ApiError } from '../middleware/errorHandler.js';

export const callsRouter = Router();

callsRouter.post('/', async (req, res, next) => {
  try {
    const body = createCallSchema.parse(req.body);
    const call = await callsService.create(body);
    res.status(201).json({ data: call });
  } catch (error) {
    next(error);
  }
});

callsRouter.get('/', async (req, res, next) => {
  try {
    const query = listCallsSchema.parse(req.query);
    const result = await callsService.list(query);
    res.status(200).json({ data: result.calls, pagination: { total: result.total, limit: result.limit, offset: result.offset } });
  } catch (error) {
    next(error);
  }
});

callsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const call = await callsService.get(id);
    if (!call) throw new ApiError(404, 'CALL_NOT_FOUND', 'That call does not exist');
    res.status(200).json({ data: call });
  } catch (error) {
    next(error);
  }
});

callsRouter.post('/:id/stages', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = upsertStageSchema.parse(req.body);
    const result = await callsService.upsertStage(id, body);
    if (!result) throw new ApiError(404, 'CALL_NOT_FOUND', 'That call does not exist');
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

callsRouter.post('/:id/close', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = closeCallSchema.parse(req.body);
    const call = await callsService.close(id, body.finalOutcome);
    if (!call) throw new ApiError(404, 'CALL_NOT_FOUND', 'That call does not exist');
    res.status(200).json({ data: call });
  } catch (error) {
    next(error);
  }
});

callsRouter.get('/:id/summary', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const call = await callsService.get(id);
    if (!call) throw new ApiError(404, 'CALL_NOT_FOUND', 'That call does not exist');
    const noteStages = call.stageResults.filter((stage) => stage.prospectStatement || stage.whatHappened);
    res.status(200).json({
      data: {
        callId: call.id,
        generated: false,
        note: 'Summaries are composed from recorded stage notes on the client. No model call is made here.',
        recordedStages: noteStages.map((stage) => stage.stageId),
      },
    });
  } catch (error) {
    next(error);
  }
});
