import { render, fireEvent } from '@testing-library/react';
import CardInspector from '../CardInspector';

describe('CardInspector', () => {
  it('renders inspector with a card container', () => {
    const card = { name: 'Sample', image: 'test.png', description: 'desc', rarity: 'common', mintNumber: 1 };
    const { container } = render(<CardInspector card={card} onClose={() => {}} />);
    const inspector = container.querySelector('.card-inspector');
    expect(inspector).not.toBeNull();
    expect(inspector.querySelector('.card-container')).not.toBeNull();
  });

  it('toggles button label on click', () => {
    const card = {
      name: 'Sample',
      image: 'test.png',
      description: 'desc',
      rarity: 'common',
      mintNumber: 1,
      isOwner: true,
      isFeatured: false,
      onToggleFeatured: jest.fn(),
    };
    const { getByText } = render(<CardInspector card={card} onClose={() => {}} />);
    const btn = getByText(/Feature/);
    fireEvent.click(btn);
    expect(getByText(/Unfeature/)).not.toBeNull();
  });
});
