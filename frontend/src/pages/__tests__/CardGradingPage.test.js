import { render, fireEvent, waitFor } from '@testing-library/react';
import CardGradingPage from '../CardGradingPage';
import { fetchWithAuth, gradeCard, fetchUserProfile } from '../../utils/api';

jest.mock('react-router-dom', () => ({ useNavigate: jest.fn() }), { virtual: true });
jest.mock('../../utils/api');

const mockCards = [
  { _id: 'c1', name: 'Alpha', rarity: 'Common', mintNumber: 10, slabbed: false },
  { _id: 'c2', name: 'Beta', rarity: 'Rare', mintNumber: 5, slabbed: true, grade: 8 },
];

beforeEach(() => {
  fetchWithAuth.mockReset();
  gradeCard.mockReset();
  fetchUserProfile.mockReset();
  fetchUserProfile.mockResolvedValue({ _id: '1', isAdmin: true });
  fetchWithAuth.mockImplementation((endpoint) => {
    if (endpoint === '/api/users/1/collection') return Promise.resolve({ cards: mockCards });
    return Promise.resolve({});
  });
});

test('filters cards by search and rarity', async () => {
  const { getByTestId, queryByText } = render(<CardGradingPage />);
  await waitFor(() => getByTestId('search-input'));

  fireEvent.change(getByTestId('search-input'), { target: { value: 'Alpha' } });
  expect(queryByText('Beta')).toBeNull();

  fireEvent.change(getByTestId('rarity-select'), { target: { value: 'Rare' } });
  expect(queryByText('Alpha')).toBeNull();
});

test('grading workflow moves card to in-progress list', async () => {
  const inProcess = [{ ...mockCards[0], gradingRequestedAt: new Date().toISOString() }, mockCards[1]];
  let callCount = 0;
  fetchWithAuth.mockImplementation((endpoint) => {
    if (endpoint === '/api/users/1/collection') {
      callCount += 1;
      if (callCount >= 2) {
        return Promise.resolve({ cards: inProcess });
      }
      return Promise.resolve({ cards: mockCards });
    }
    return Promise.resolve({});
  });

  const { getByTestId } = render(<CardGradingPage />);
  await waitFor(() => getByTestId('select-btn-c1'));

  fireEvent.click(getByTestId('select-btn-c1'));
  await waitFor(() => getByTestId('selected-card-area'));

  fireEvent.click(getByTestId('grade-btn'));
  await waitFor(() => getByTestId('inprocess-list'));
  expect(getByTestId('inprocess-list')).toBeDefined();
});

test('cancel deselects the card', async () => {
  fetchWithAuth.mockResolvedValueOnce({ cards: mockCards });
  const { getByTestId, queryByTestId } = render(<CardGradingPage />);
  await waitFor(() => getByTestId('select-btn-c1'));
  fireEvent.click(getByTestId('select-btn-c1'));
  await waitFor(() => getByTestId('selected-card-area'));
  fireEvent.click(getByTestId('cancel-btn'));
  await waitFor(() => getByTestId('collection-list'));
  expect(queryByTestId('selected-card-area')).toBeNull();
});
