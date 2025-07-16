import { render, fireEvent, waitFor } from '@testing-library/react';
import AdminGradingPage from '../AdminGradingPage';
import { fetchWithAuth, gradeCard } from '../../utils/api';

jest.mock('../../utils/api');

const mockUsers = [{ _id: '1', username: 'Alice' }];
const mockCards = [
  { _id: 'c1', name: 'Alpha', rarity: 'Common', mintNumber: 10, slabbed: false },
  { _id: 'c2', name: 'Beta', rarity: 'Rare', mintNumber: 5, slabbed: true, grade: 8 },
];

beforeEach(() => {
  fetchWithAuth.mockReset();
  gradeCard.mockReset();
  fetchWithAuth.mockImplementation((endpoint) => {
    if (endpoint === '/api/admin/users') return Promise.resolve(mockUsers);
    if (endpoint === '/api/users/1/collection') return Promise.resolve({ cards: mockCards });
    return Promise.resolve({});
  });
});

test('filters cards by search and rarity', async () => {
  const { getByTestId, queryByText } = render(<AdminGradingPage />);
  const select = getByTestId('user-select');
  await waitFor(() => select.querySelector('option[value="1"]'));
  fireEvent.change(select, { target: { value: '1' } });
  await waitFor(() => getByTestId('search-input'));

  fireEvent.change(getByTestId('search-input'), { target: { value: 'Alpha' } });
  expect(queryByText('Beta')).toBeNull();

  fireEvent.change(getByTestId('rarity-select'), { target: { value: 'Rare' } });
  expect(queryByText('Alpha')).toBeNull();
});

test('grading workflow reveals card', async () => {
  const updatedCards = [{ ...mockCards[0], slabbed: true, grade: 9 }, mockCards[1]];
  fetchWithAuth.mockImplementationOnce(() => Promise.resolve(mockUsers))
    .mockImplementationOnce(() => Promise.resolve({ cards: mockCards }))
    .mockImplementationOnce(() => Promise.resolve({ cards: updatedCards }));

  const { getByTestId } = render(<AdminGradingPage />);
  const select = getByTestId('user-select');
  await waitFor(() => select.querySelector('option[value="1"]'));
  fireEvent.change(select, { target: { value: '1' } });
  await waitFor(() => getByTestId('grade-btn-c1'));

  fireEvent.click(getByTestId('grade-btn-c1'));
  await waitFor(() => getByTestId('graded-card-wrapper'));

  const wrapper = getByTestId('graded-card-wrapper');
  expect(wrapper.className).toContain('face-down');
  fireEvent.click(wrapper);
  expect(wrapper.className).toContain('face-up');
});
