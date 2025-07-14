import { render } from '@testing-library/react';
import AdminGradingPage from '../AdminGradingPage';

test('renders grading page heading', () => {
  const { getByText } = render(<AdminGradingPage />);
  const heading = getByText(/Admin Card Grading/i);
  expect(heading).not.toBeNull();
});
