import {
  allowedActions,
  effectiveStatus,
  meetingUrlVisible,
  resolveConfirmations,
  type ActionContext,
  type SessionTimes,
} from './session-state';

const MENTOR = 'mentor';
const STUDENT = 'student';
const at = (hour: number) => new Date(Date.UTC(2026, 9, 7, hour));

function session(status: SessionTimes['status'], startHour = 10, endHour = 11): SessionTimes {
  return { status, startsAt: at(startHour), endsAt: at(endHour) };
}

function context(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    userId: STUDENT,
    mentorId: MENTOR,
    studentId: STUDENT,
    lastProposedById: STUDENT,
    myConfirmation: null,
    reviewedByMe: false,
    ...overrides,
  };
}

describe('effectiveStatus', () => {
  it('ACCEPTED vira IN_PROGRESS durante a aula e AWAITING_CONFIRMATION depois', () => {
    const accepted = session('ACCEPTED');
    expect(effectiveStatus(accepted, at(9))).toBe('ACCEPTED');
    expect(effectiveStatus(accepted, at(10))).toBe('IN_PROGRESS');
    expect(effectiveStatus(accepted, at(11))).toBe('AWAITING_CONFIRMATION');
  });

  it('estados finais não mudam com o tempo', () => {
    for (const status of ['CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW', 'DISPUTED'] as const) {
      expect(effectiveStatus(session(status), at(23))).toBe(status);
    }
  });
});

describe('allowedActions', () => {
  it('quem propôs só pode retirar; quem recebe pode aceitar, recusar ou sugerir outro horário', () => {
    const pending = session('PENDING', 10, 11);
    expect(allowedActions(pending, context({ userId: STUDENT }), at(8))).toEqual(['CANCEL']);
    expect(allowedActions(pending, context({ userId: MENTOR }), at(8))).toEqual([
      'ACCEPT',
      'REJECT',
      'PROPOSE_TIME',
    ]);
  });

  it('depois de uma contraproposta do mentor, a vez é do aluno', () => {
    const pending = session('PENDING', 10, 11);
    const afterCounter = { lastProposedById: MENTOR };
    expect(allowedActions(pending, context({ userId: STUDENT, ...afterCounter }), at(8))).toContain(
      'ACCEPT',
    );
    expect(allowedActions(pending, context({ userId: MENTOR, ...afterCounter }), at(8))).toEqual([
      'CANCEL',
    ]);
  });

  it('solicitação com horário já passado não oferece ações (expira)', () => {
    expect(allowedActions(session('PENDING', 10, 11), context({ userId: MENTOR }), at(12))).toEqual(
      [],
    );
  });

  it('só o mentor edita o link; ninguém cancela uma aula já iniciada', () => {
    const accepted = session('ACCEPTED');
    expect(allowedActions(accepted, context({ userId: MENTOR }), at(8))).toEqual([
      'UPDATE_MEETING',
      'CANCEL',
    ]);
    expect(allowedActions(accepted, context({ userId: STUDENT }), at(8))).toEqual(['CANCEL']);
    expect(allowedActions(accepted, context({ userId: STUDENT }), at(10))).toEqual([]);
    expect(allowedActions(accepted, context({ userId: MENTOR }), at(10))).toEqual([
      'UPDATE_MEETING',
    ]);
  });

  it('só confirma depois do fim da aula e uma única vez', () => {
    const accepted = session('ACCEPTED');
    expect(allowedActions(accepted, context(), at(10))).not.toContain('CONFIRM');
    expect(allowedActions(accepted, context(), at(11))).toEqual(['CONFIRM']);
    expect(allowedActions(accepted, context({ myConfirmation: 'YES' }), at(11))).toEqual([]);
  });

  it('avaliação só em aula concluída e uma única vez', () => {
    expect(allowedActions(session('COMPLETED'), context(), at(12))).toEqual(['REVIEW']);
    expect(allowedActions(session('COMPLETED'), context({ reviewedByMe: true }), at(12))).toEqual(
      [],
    );
    expect(allowedActions(session('CANCELLED'), context(), at(12))).toEqual([]);
    expect(allowedActions(session('DISPUTED'), context(), at(12))).toEqual([]);
  });
});

describe('resolveConfirmations', () => {
  it.each([
    [null, null, 'WAITING'],
    ['YES', null, 'WAITING'],
    [null, 'NO', 'WAITING'],
    ['YES', 'YES', 'COMPLETED'],
    ['NO', 'NO', 'NO_SHOW'],
    ['YES', 'NO', 'DISPUTED'],
    ['NO', 'YES', 'DISPUTED'],
  ] as const)('aluno=%s mentor=%s → %s', (student, mentor, expected) => {
    expect(resolveConfirmations(student, mentor)).toBe(expected);
  });
});

describe('meetingUrlVisible', () => {
  it('só mostra o link depois do aceite', () => {
    expect(meetingUrlVisible('PENDING')).toBe(false);
    expect(meetingUrlVisible('REJECTED')).toBe(false);
    expect(meetingUrlVisible('CANCELLED')).toBe(false);
    expect(meetingUrlVisible('ACCEPTED')).toBe(true);
    expect(meetingUrlVisible('COMPLETED')).toBe(true);
  });
});
