import { render, fireEvent, waitFor } from '@testing-library/react';
import CardGradingPage from '../CardGradingPage';
import { fetchWithAuth, gradeCard, revealGradedCard, fetchUserProfile } from '../../utils/api';

jest.mock('../../components/BaseCard', () => () => <div data-testid="mock-base-card" />);
jest.mock('../../components/GradingInProgressCard', () => ({ card, isRevealed, onFinish, onReveal, onDone }) => (
  <div data-testid={`inprocess-card-${card._id}`}>
    <span>{card.name}</span>
    {card.slabbed ? (
      <>
        <button data-testid={`reveal-btn-${card._id}`} onClick={onReveal}>Reveal</button>
        {isRevealed && (
          <button data-testid={`done-btn-${card._id}`} onClick={onDone}>Done</button>
        )}
      </>
    ) : (
      <button data-testid={`finish-btn-${card._id}`} onClick={() => onFinish(card._id)}>Finish</button>
    )}
  </div>
));
jest.mock('../../utils/api');

const mockCards = [
  { _id: 'c1', name: 'Alpha', rarity: 'Common', mintNumber: 10, slabbed: false, status: 'available' },
  { _id: 'c2', name: 'Beta', rarity: 'Rare', mintNumber: 5, slabbed: true, grade: 8, status: 'available' },
];

beforeEach(() => {
  fetchWithAuth.mockReset();
  gradeCard.mockReset();
  revealGradedCard.mockReset();
  fetchUserProfile.mockReset();
  fetchUserProfile.mockResolvedValue({ _id: '1', isAdmin: true });
  window.showToast = jest.fn();

  fetchWithAuth.mockImplementation((endpoint) => {
    if (endpoint === '/api/users/1/collection') return Promise.resolve({ cards: mockCards });
    return Promise.resolve({});
  });
});

afterEach(() => {
  delete window.showToast;
});

test('grading workflow moves card to in-progress list', async () => {
  const inProcessCards = [{ ...mockCards[0], gradingRequestedAt: new Date().toISOString() }, mockCards[1]];
  let callCount = 0;

  fetchWithAuth.mockImplementation((endpoint) => {
    if (endpoint === '/api/users/1/collection') {
      callCount += 1;
      return Promise.resolve({ cards: callCount >= 2 ? inProcessCards : mockCards });
    }
    return Promise.resolve({});
  });

  const { getByTestId, queryByTestId } = render(<CardGradingPage />);
  await waitFor(() => getByTestId('select-btn-c1'));

  fireEvent.click(getByTestId('select-btn-c1'));
  await waitFor(() => getByTestId('selected-card-area'));

  fireEvent.click(getByTestId('grade-btn'));

  await waitFor(() => getByTestId('inprocess-list'));
  expect(gradeCard).toHaveBeenCalledWith('1', 'c1');
  expect(queryByTestId('inprocess-card-c1')).not.toBeNull();
});

test('cancel deselects the card', async () => {
  const { getByTestId, queryByTestId } = render(<CardGradingPage />);
  await waitFor(() => getByTestId('select-btn-c1'));

  fireEvent.click(getByTestId('select-btn-c1'));
  await waitFor(() => getByTestId('selected-card-area'));

  fireEvent.click(getByTestId('cancel-btn'));

  await waitFor(() => getByTestId('collection-list'));
  expect(queryByTestId('selected-card-area')).toBeNull();
});

test('accept completed reveals all slabbed in-progress cards with one action', async () => {
  const initialCards = [
    { _id: 'c1', name: 'Done One', rarity: 'Common', mintNumber: 1, slabbed: true, gradingRequestedAt: new Date().toISOString(), status: 'available' },
    { _id: 'c2', name: 'Done Two', rarity: 'Rare', mintNumber: 2, slabbed: true, gradingRequestedAt: new Date().toISOString(), status: 'available' },
    { _id: 'c3', name: 'Still Waiting', rarity: 'Epic', mintNumber: 3, slabbed: false, gradingRequestedAt: new Date().toISOString(), status: 'available' },
  ];
  const afterAcceptCards = [
    { ...initialCards[0], gradingRequestedAt: undefined },
    { ...initialCards[1], gradingRequestedAt: undefined },
    initialCards[2],
  ];

  let collectionFetchCount = 0;
  fetchWithAuth.mockImplementation((endpoint) => {
    if (endpoint === '/api/users/1/collection') {
      collectionFetchCount += 1;
      return Promise.resolve({ cards: collectionFetchCount >= 2 ? afterAcceptCards : initialCards });
    }
    return Promise.resolve({});
  });

  const { getByTestId } = render(<CardGradingPage />);

  await waitFor(() => getByTestId('accept-all-completed-btn'));
  fireEvent.click(getByTestId('accept-all-completed-btn'));

  await waitFor(() => expect(revealGradedCard).toHaveBeenCalledTimes(2));
  expect(revealGradedCard).toHaveBeenNthCalledWith(1, '1', 'c1');
  expect(revealGradedCard).toHaveBeenNthCalledWith(2, '1', 'c2');
});
