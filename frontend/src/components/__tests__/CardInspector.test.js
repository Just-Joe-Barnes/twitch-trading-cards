import { render } from '@testing-library/react';
import CardInspector from '../CardInspector';

describe('CardInspector', () => {
  it('renders inspector with a card container', () => {
    const card = { name: 'Sample', image: 'test.png', description: 'desc', rarity: 'common', mintNumber: 1 };
    const { container } = render(<CardInspector card={card} onClose={() => {}} />);
    const inspector = container.querySelector('.card-inspector');
    expect(inspector).not.toBeNull();
    expect(inspector.querySelector('.card-container')).not.toBeNull();
  });
});
