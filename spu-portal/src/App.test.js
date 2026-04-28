import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  login: jest.fn(),
  logoutUser: jest.fn(),
}));

test('renders the login screen', () => {
  render(<App />);
  expect(screen.getByText(/Academic Portal/i)).toBeInTheDocument();
});
