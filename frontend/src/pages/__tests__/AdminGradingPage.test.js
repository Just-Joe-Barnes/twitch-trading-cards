import { render, fireEvent, waitFor } from '@testing-library/react';
import AdminGradingPage from '../AdminGradingPage';
import { fetchWithAuth, gradeCard, fetchUserProfile } from '../../utils/api';

jest.mock('../../utils/api');

const mockUsers = [{ _id: '1', username: 'Alice' }];
const mockCards = [
  { _id: 'c1', name: 'Alpha', rarity: 'Common', mintNumber: 10, slabbed: false },
  { _id: 'c2', name: 'Beta', rarity: 'Rare', mintNumber: 5, slabbed: true, grade: 8 },
];

beforeEach(() => {
  fetchWithAuth.mockReset();
  gradeCard.mockReset();
  fetchUserProfile.mockReset();
  fetchUserProfile.mockResolvedValue({ _id: '1' });
  fetchWithAuth.mockImplementation((endpoint) => {
    if (endpoint === '/api/admin/users') return Promise.resolve(mockUsers);
    if (endpoint === '/api/users/1/collection') return Promise.resolve({ cards: mockCards });
    return Promise.resolve({});
  });
});

test('filters cards by search and rarity', async () => {
  const { getByTestId, queryByText } = render(<AdminGradingPage />);
  await waitFor(() => getByTestId('search-input'));
  const select = getByTestId('user-select');
  fireEvent.change(select, { target: { value: '1' } });

  fireEvent.change(getByTestId('search-input'), { target: { value: 'Alpha' } });
  expect(queryByText('Beta')).toBeNull();

  fireEvent.change(getByTestId('rarity-select'), { target: { value: 'Rare' } });
  expect(queryByText('Alpha')).toBeNull();
});

test('grading workflow moves card to in-progress list', async () => {
  const inProcess = [{ ...mockCards[0], gradingRequestedAt: new Date().toISOString() }, mockCards[1]];
  let callCount = 0;
  fetchWithAuth.mockImplementation((endpoint) => {
    if (endpoint === '/api/admin/users') return Promise.resolve(mockUsers);
    if (endpoint === '/api/users/1/collection') {
      callCount += 1;
      if (callCount >= 3) {
        return Promise.resolve({ cards: inProcess });
      }
      return Promise.resolve({ cards: mockCards });
    }
    return Promise.resolve({});
  });

  const { getByTestId } = render(<AdminGradingPage />);
  const select = getByTestId('user-select');
  await waitFor(() => select.querySelector('option[value="1"]'));
  fireEvent.change(select, { target: { value: '1' } });
  await waitFor(() => getByTestId('select-btn-c1'));

  fireEvent.click(getByTestId('select-btn-c1'));
  await waitFor(() => getByTestId('selected-card-area'));

  fireEvent.click(getByTestId('grade-btn'));
  await waitFor(() => getByTestId('inprocess-list'));
  expect(getByTestId('inprocess-list')).toBeDefined();
});
