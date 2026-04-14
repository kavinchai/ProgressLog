import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../components/Modal';

vi.mock('../components/Modal.css', () => ({}));

describe('Modal', () => {
  it('renders the title', () => {
    render(<Modal title="Test Title" onClose={() => {}}><p>content</p></Modal>);
    expect(screen.getByText(/Test Title/)).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<Modal title="Title" onClose={() => {}}><p>Hello World</p></Modal>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('calls onClose when the X button is clicked', async () => {
    const onClose = vi.fn();
    render(<Modal title="Title" onClose={onClose}><p>content</p></Modal>);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the overlay', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Title" onClose={onClose}><p>content</p></Modal>
    );
    const overlay = container.querySelector('.modal-overlay');
    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the modal box', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Title" onClose={onClose}><p>inside content</p></Modal>
    );
    const box = container.querySelector('.modal-box');
    await userEvent.click(box);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal title="Title" onClose={onClose}><p>content</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose for other key presses', () => {
    const onClose = vi.fn();
    render(<Modal title="Title" onClose={onClose}><p>content</p></Modal>);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
