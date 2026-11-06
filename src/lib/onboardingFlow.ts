export type OnboardingStep =
  | 'business' | 'segment' | 'owner' | 'management' | 'reception' | 'team' | 'services' | 'hours' | 'review';

export type Management = 'self' | 'reception' | 'team';

export interface FlowAnswers {
  management: Management;
}

/** Etapas realmente necessárias para este negócio — recepção só aparece quando escolhida. */
export function getSteps(a: FlowAnswers): OnboardingStep[] {
  const steps: OnboardingStep[] = ['business', 'segment', 'owner', 'management'];
  if (a.management === 'reception') steps.push('reception');
  steps.push('team', 'services', 'hours', 'review');
  return steps;
}

export function operationModeFor(m: Management): 'reception' | 'individual' {
  return m === 'reception' ? 'reception' : 'individual';
}
