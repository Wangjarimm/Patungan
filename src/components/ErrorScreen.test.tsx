import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ErrorScreen } from './ErrorScreen';

describe('ErrorScreen', () => {
  it('explains the problem, logs it, and retries', async () => {
    const error = new Error('boom');
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const retry = jest.fn(async () => undefined);

    await render(<ErrorScreen error={error} retry={retry} />);
    expect(screen.getByRole('header', { name: 'Ada yang salah' })).toBeOnTheScreen();
    expect(screen.getByText(/Tagihanmu tetap tersimpan di HP/)).toBeOnTheScreen();
    expect(logged).toHaveBeenCalledWith('[error-boundary]', error);

    await fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
    logged.mockRestore();
  });
});
