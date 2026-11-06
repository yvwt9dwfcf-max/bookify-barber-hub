import { describe, it, expect } from 'vitest';
import { getSteps, operationModeFor } from './onboardingFlow';

describe('onboarding flow', () => {
  it('skips the receptionist step when the owner manages bookings', () => {
    expect(getSteps({ management: 'self' })).not.toContain('reception');
  });
  it('includes the receptionist step only when a receptionist is chosen', () => {
    const steps = getSteps({ management: 'reception' });
    expect(steps.indexOf('reception')).toBe(steps.indexOf('management') + 1);
  });
  it('reception mode is enabled only with a receptionist', () => {
    expect(operationModeFor('reception')).toBe('reception');
    expect(operationModeFor('team')).toBe('individual');
  });
});
