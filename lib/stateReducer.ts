import { ProcessingState, RedactedDocument, DetectionResult } from '@/types';

/**
 * Actions for the processing state reducer
 */
export type ProcessingAction =
  | { type: 'START_UPLOAD' }
  | { type: 'UPDATE_UPLOAD_PROGRESS'; progress: number }
  | { type: 'START_EXTRACTING'; totalPages?: number }
  | { type: 'UPDATE_EXTRACTING_PROGRESS'; currentPage: number; totalPages: number }
  | { type: 'START_DETECTING' }
  | { type: 'START_REDACTING'; totalPages?: number }
  | { type: 'UPDATE_REDACTING_PROGRESS'; currentPage: number; totalPages: number }
  | { type: 'COMPLETE'; result: RedactedDocument; detections: DetectionResult }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

/**
 * Processing state reducer
 * Manages state transitions: idle → uploading → extracting → detecting → redacting → complete
 * Also handles error states and reset
 */
export function processingReducer(
  state: ProcessingState,
  action: ProcessingAction
): ProcessingState {
  switch (action.type) {
    case 'START_UPLOAD':
      return { status: 'uploading', progress: 0 };

    case 'UPDATE_UPLOAD_PROGRESS':
      if (state.status === 'uploading') {
        return { status: 'uploading', progress: action.progress };
      }
      return state;

    case 'START_EXTRACTING':
      return {
        status: 'extracting',
        currentPage: action.totalPages ? 1 : undefined,
        totalPages: action.totalPages,
      };

    case 'UPDATE_EXTRACTING_PROGRESS':
      if (state.status === 'extracting') {
        return {
          status: 'extracting',
          currentPage: action.currentPage,
          totalPages: action.totalPages,
        };
      }
      return state;

    case 'START_DETECTING':
      return { status: 'detecting' };

    case 'START_REDACTING':
      return {
        status: 'redacting',
        currentPage: action.totalPages ? 1 : undefined,
        totalPages: action.totalPages,
      };

    case 'UPDATE_REDACTING_PROGRESS':
      if (state.status === 'redacting') {
        return {
          status: 'redacting',
          currentPage: action.currentPage,
          totalPages: action.totalPages,
        };
      }
      return state;

    case 'COMPLETE':
      return {
        status: 'complete',
        result: action.result,
        detections: action.detections,
      };

    case 'ERROR':
      return { status: 'error', error: action.error };

    case 'RESET':
      return { status: 'idle' };

    default:
      return state;
  }
}
