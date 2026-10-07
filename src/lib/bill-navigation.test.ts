import {
  BILL_ROUTE_NAME,
  createTransitionLock,
  decideBillNavigation,
  type StackRouteLike,
} from './bill-navigation';

const tabs: StackRouteLike = { key: 'tabs', name: '(tabs)' };
const bill = (id: string, key = `bill-${id}`): StackRouteLike => ({
  key,
  name: BILL_ROUTE_NAME,
  params: { id },
});

describe('decideBillNavigation', () => {
  it('pushes a bill that is not in the stack', () => {
    expect(decideBillNavigation([tabs], 0, 'a', false)).toBe('push');
  });

  it('ignores every tap while a screen transition is running', () => {
    expect(decideBillNavigation([tabs], 0, 'a', true)).toBe('ignore');
    expect(decideBillNavigation([tabs, bill('b')], 0, 'b', true)).toBe('ignore');
  });

  it('ignores a tap for the bill that is already on screen', () => {
    expect(decideBillNavigation([tabs, bill('a')], 1, 'a', false)).toBe('ignore');
  });

  it('goes back to a bill lower in the stack instead of pushing a copy', () => {
    const routes = [
      tabs,
      bill('a'),
      { key: 'menu', name: 'tagihan/[id]/menu', params: { id: 'a' } },
    ];
    expect(decideBillNavigation(routes, 2, 'a', false)).toBe('pop-to');
  });

  it('only matches the bill screen with the same id', () => {
    const routes = [tabs, bill('a'), { key: 'other', name: 'grup/[id]', params: { id: 'b' } }];
    expect(decideBillNavigation(routes, 2, 'b', false)).toBe('push');
    expect(decideBillNavigation([tabs, { key: 'x', name: BILL_ROUTE_NAME }], 1, 'a', false)).toBe(
      'push',
    );
  });
});

describe('createTransitionLock', () => {
  it('is free until a transition starts and after it ends', () => {
    const lock = createTransitionLock(1000);
    expect(lock.isBusy(0)).toBe(false);
    lock.start('tabs', 0);
    expect(lock.isBusy(100)).toBe(true);
    lock.end('tabs');
    expect(lock.isBusy(200)).toBe(false);
  });

  it('stays busy while any screen is still transitioning', () => {
    const lock = createTransitionLock(1000);
    lock.start('tabs', 0);
    lock.start('bill-a', 0);
    lock.end('bill-a');
    expect(lock.isBusy(50)).toBe(true);
    lock.end('tabs');
    expect(lock.isBusy(60)).toBe(false);
  });

  it('releases itself when the end event never arrives', () => {
    const lock = createTransitionLock(1000);
    lock.start('tabs', 0);
    expect(lock.isBusy(999)).toBe(true);
    expect(lock.isBusy(1000)).toBe(false);
    expect(lock.isBusy(1)).toBe(false);
  });

  it('ignores an end for a screen it never saw', () => {
    const lock = createTransitionLock();
    lock.end('unknown');
    expect(lock.isBusy(0)).toBe(false);
  });
});
