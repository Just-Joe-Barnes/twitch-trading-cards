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

  it('adds closing class when overlay is clicked', () => {
    jest.useFakeTimers();
    const card = { name: 'Sample', image: 'test.png', description: 'desc', rarity: 'common', mintNumber: 1 };
    const onClose = jest.fn();
    const { container } = render(<CardInspector card={card} onClose={onClose} />);
    const overlay = container.querySelector('.card-inspector-overlay');
    fireEvent.click(overlay);
    expect(overlay.classList.contains('closing')).toBe(true);
    jest.runAllTimers();
    expect(onClose).toHaveBeenCalled();
  });
});
