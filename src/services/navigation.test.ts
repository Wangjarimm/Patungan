import { TRANSITION_LOCK_MAX_MS } from '@/lib/bill-navigation';

import { trackScreenTransitions } from './navigation';

jest.mock('expo-router', () => ({ router: {}, useNavigationContainerRef: jest.fn() }));

const goBack = { type: 'GO_BACK' };

function setup() {
  const dispatch = jest.fn();
  const tabs = trackScreenTransitions({
    route: { key: 'tabs' },
    navigation: { dispatch },
  });
  const bill = trackScreenTransitions({
    route: { key: 'bill' },
    navigation: { dispatch },
  });
  const removeBill = () => {
    const preventDefault = jest.fn();
    bill.beforeRemove({ preventDefault, data: { action: goBack } });
    return preventDefault;
  };
  return { dispatch, tabs, bill, removeBill };
}

beforeEach(() => {
  jest.useFakeTimers();
  // Let any lock left by an earlier test expire.
  jest.advanceTimersByTime(TRANSITION_LOCK_MAX_MS);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('trackScreenTransitions', () => {
  it('lets a back press through once the bill has finished opening', () => {
    const { dispatch, tabs, bill, removeBill } = setup();
    bill.focus();
    tabs.transitionStart();
    bill.transitionStart();
    bill.transitionEnd();
    tabs.transitionEnd();

    expect(removeBill()).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('holds a back press made while the bill is still opening until the animation ends', () => {
    const { dispatch, tabs, bill, removeBill } = setup();
    bill.focus();
    tabs.transitionStart();
    bill.transitionStart();

    expect(removeBill()).toHaveBeenCalled();
    bill.transitionEnd();
    expect(dispatch).not.toHaveBeenCalled();
    tabs.transitionEnd();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(goBack);

    // The timer fallback must not send the same back press again.
    jest.advanceTimersByTime(TRANSITION_LOCK_MAX_MS);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('still goes back when the native end event never arrives', () => {
    const { dispatch, bill, removeBill } = setup();
    bill.focus();

    expect(removeBill()).toHaveBeenCalled();
    jest.advanceTimersByTime(TRANSITION_LOCK_MAX_MS - 1);
    expect(dispatch).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith(goBack);
  });
});
