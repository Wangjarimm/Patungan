// Opening a bill from a list must never stack a second copy of the same bill screen.
// A push that lands while the previous copy is still animating away leaves react-native-screens
// with two overlapping copies and then a blank screen, so taps during a transition are dropped.

export const BILL_ROUTE_NAME = 'tagihan/[id]/index';

// Longest a transition may hold the lock if the native "transition ended" event never arrives.
export const TRANSITION_LOCK_MAX_MS = 1000;

export type StackRouteLike = {
  key: string;
  name: string;
  params?: object;
};

export type BillNavigation = 'push' | 'pop-to' | 'ignore';

function routeBillId(route: StackRouteLike): unknown {
  return route.params && 'id' in route.params ? route.params.id : undefined;
}

export function decideBillNavigation(
  routes: readonly StackRouteLike[],
  focusedIndex: number,
  billId: string,
  transitioning: boolean,
): BillNavigation {
  if (transitioning) return 'ignore';
  const existing = routes.findLastIndex(
    (route) => route.name === BILL_ROUTE_NAME && routeBillId(route) === billId,
  );
  if (existing === -1) return 'push';
  // Already showing this bill: nothing to do. Lower in the stack: go back to it, no copy.
  return existing === focusedIndex ? 'ignore' : 'pop-to';
}

export type TransitionLock = {
  start: (routeKey: string, now: number) => void;
  end: (routeKey: string) => void;
  isBusy: (now: number) => boolean;
};

// Tracks screens that are animating in or out. Entries older than maxMs count as finished.
export function createTransitionLock(maxMs: number = TRANSITION_LOCK_MAX_MS): TransitionLock {
  const startedAt = new Map<string, number>();
  return {
    start(routeKey, now) {
      startedAt.set(routeKey, now);
    },
    end(routeKey) {
      startedAt.delete(routeKey);
    },
    isBusy(now) {
      let busy = false;
      for (const [routeKey, time] of startedAt) {
        if (now - time < maxMs) busy = true;
        else startedAt.delete(routeKey);
      }
      return busy;
    },
  };
}
