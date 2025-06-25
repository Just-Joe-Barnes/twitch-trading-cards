import { render } from '@testing-library/react';
import CardInspector from '../CardInspector';

describe('CardInspector', () => {
  it('renders inspector with scaling variables', () => {
    const card = { name: 'Sample', image: 'test.png', description: 'desc', rarity: 'common', mintNumber: 1 };
    const { container } = render(<CardInspector card={card} onClose={() => {}} />);
    const inspector = container.querySelector('.card-inspector');
    expect(inspector).not.toBeNull();
    const styles = getComputedStyle(inspector);
    expect(styles.getPropertyValue('--card-scale')).not.toBe('');
  });
});
