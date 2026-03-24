import { describe, it, expect } from 'vitest';
import * as client from '../api/client';

describe('API Client', () => {
  it('exports fetchDashboardSummary as a function', () => {
    expect(typeof client.fetchDashboardSummary).toBe('function');
  });

  it('exports fetchBoardData as a function', () => {
    expect(typeof client.fetchBoardData).toBe('function');
  });

  it('exports transitionWorkItem as a function', () => {
    expect(typeof client.transitionWorkItem).toBe('function');
  });

  it('exports fetchWorkItems as a function', () => {
    expect(typeof client.fetchWorkItems).toBe('function');
  });

  it('exports fetchWorkItem as a function', () => {
    expect(typeof client.fetchWorkItem).toBe('function');
  });

  it('exports createWorkItem as a function', () => {
    expect(typeof client.createWorkItem).toBe('function');
  });

  it('exports updateWorkItem as a function', () => {
    expect(typeof client.updateWorkItem).toBe('function');
  });

  it('exports deleteWorkItem as a function', () => {
    expect(typeof client.deleteWorkItem).toBe('function');
  });

  it('exports proposeWorkItem as a function', () => {
    expect(typeof client.proposeWorkItem).toBe('function');
  });

  it('exports reviewWorkItem as a function', () => {
    expect(typeof client.reviewWorkItem).toBe('function');
  });

  it('exports fetchWorkItemHistory as a function', () => {
    expect(typeof client.fetchWorkItemHistory).toBe('function');
  });
});
