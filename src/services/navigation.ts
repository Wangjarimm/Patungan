import { router, useNavigationContainerRef } from 'expo-router';
import { useCallback } from 'react';

import {
  createTransitionLock,
  decideBillNavigation,
  TRANSITION_LOCK_MAX_MS,
} from '@/lib/bill-navigation';

const transitionLock = createTransitionLock();

// A back press that arrives while a screen is still animating in. Popping right then leaves
// react-native-screens on Android with the screen underneath never re-attached: a blank screen
// with no JS error. So the removal waits until the transition has ended.
let pendingRemoval: (() => void) | null = null;

function flushPendingRemoval(): void {
  if (!pendingRemoval || transitionLock.isBusy(Date.now())) return;
  const run = pendingRemoval;
  pendingRemoval = null;
  run();
}

type BeforeRemoveEvent = { preventDefault: () => void; data: { action: NavigationAction } };
type NavigationAction = { type: string };

// Passed to the root Stack's screenListeners. A screen counts as transitioning from the moment
// it gains focus (before the native animation starts) until it has fully appeared or disappeared.
export function trackScreenTransitions({
  route,
  navigation,
}: {
  route: { key: string };
  navigation: { dispatch: (action: NavigationAction) => void };
}) {
  return {
    focus: () => transitionLock.start(route.key, Date.now()),
    beforeRemove: (e: BeforeRemoveEvent) => {
      if (!transitionLock.isBusy(Date.now())) return;
      e.preventDefault();
      pendingRemoval = () => navigation.dispatch(e.data.action);
      // Fallback in case the native "transition ended" event never arrives.
      setTimeout(flushPendingRemoval, TRANSITION_LOCK_MAX_MS);
    },
    transitionStart: () => transitionLock.start(route.key, Date.now()),
    transitionEnd: () => {
      transitionLock.end(route.key);
      flushPendingRemoval();
    },
  };
}

// Opens a bill without ever stacking a second copy of its screen.
export function useOpenBill(): (billId: string) => void {
  const navigationRef = useNavigationContainerRef();
  return useCallback(
    (billId: string) => {
      const state = navigationRef.getRootState();
      const decision = decideBillNavigation(
        state?.routes ?? [],
        state?.index ?? 0,
        billId,
        transitionLock.isBusy(Date.now()),
      );
      const href = { pathname: '/tagihan/[id]', params: { id: billId } } as const;
      if (decision === 'push') router.push(href);
      else if (decision === 'pop-to') router.dismissTo(href);
    },
    [navigationRef],
  );
}
