import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from '../HomeScreen';
import { getTheme } from '../../../ui/theme';

describe('Home screen foundation', () => {
  it('starts with an honest empty history instead of prototype workout data', async () => {
    await render(<HomeScreen theme={getTheme('light')} />);

    expect(screen.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
    expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
    expect(screen.getByText('Your completed workouts will appear here.')).toBeOnTheScreen();
    expect(screen.queryByText('Gym A')).toBeNull();
    expect(screen.queryByText('4 weeks')).toBeNull();
  });

  it.each(['light', 'dark'] as const)('uses the %s appearance for the overview', async (scheme) => {
    const theme = getTheme(scheme);
    await render(<HomeScreen theme={theme} />);

    expect(screen.getByTestId('home-screen')).toHaveStyle({ backgroundColor: theme.background });
    expect(screen.getByText('Today')).toHaveStyle({ color: theme.text });
  });

  it('keeps the screen readable when the system has no appearance preference', async () => {
    await render(<HomeScreen theme={getTheme(null)} />);

    expect(screen.getByTestId('home-screen')).toHaveStyle({
      backgroundColor: getTheme('light').background,
    });
    expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
  });
});
