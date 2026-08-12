import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ChatRow } from '../src/components/ChatRow';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.View = (props: any) => RN.createElement('View', props, props.children);
  RN.Text = (props: any) => RN.createElement('Text', props, props.children);
  RN.Pressable = (props: any) => RN.createElement('Pressable', props, props.children);
  return RN;
});

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: { primary: 'red', mutedForeground: 'grey' }
  }),
}));

jest.mock('../src/components/Avatar', () => ({
  Avatar: () => null,
}));

jest.mock('../src/components/AppText', () => ({
  AppText: () => null,
}));

jest.mock('date-fns', () => ({
  formatDistanceToNowStrict: () => '2 days',
}));

const baseProps = {
  name: 'Zain Ali',
  photoURL: null,
  lastMessage: 'Hey, whats up?',
  onPress: () => {},
};

const mockTimestamp = {
  toDate: () => new Date(),
  seconds: 0,
  nanoseconds: 0,
  isEqual: () => true,
};

describe('ChatRow — Robust UI Tests', () => {
  it('renders name correctly', () => {
    render(<ChatRow {...baseProps} />);
    expect(screen.getByText('Zain Ali')).toBeTruthy();
  });

  it('renders the last message text', () => {
    render(<ChatRow {...baseProps} />);
    expect(screen.getByText('Hey, whats up?')).toBeTruthy();
  });

  it('shows "No messages yet" when no lastMessage is provided', () => {
    render(<ChatRow name="Test User" photoURL={null} onPress={() => {}} />);
    expect(screen.getByText('No messages yet')).toBeTruthy();
  });

  it('shows "New message request" when pending', () => {
    render(<ChatRow {...baseProps} pending />);
    expect(screen.getByText('New message request')).toBeTruthy();
  });

  it('renders unread badge when unreadCount > 0', () => {
    render(<ChatRow {...baseProps} unreadCount={5} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('caps unread badge at 99+', () => {
    render(<ChatRow {...baseProps} unreadCount={150} />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('does NOT show badge when unreadCount is 0', () => {
    render(<ChatRow {...baseProps} unreadCount={0} />);
    expect(screen.queryByText('99+')).toBeNull();
  });

  it('shows formatted time when lastMessageAt is provided', () => {
    render(<ChatRow {...baseProps} lastMessageAt={mockTimestamp as any} />);
    expect(screen.getByText('2d')).toBeTruthy();
  });

  it('handles extremely long names without crashing', () => {
    const longName = 'A'.repeat(200);
    render(<ChatRow name={longName} photoURL={null} onPress={() => {}} />);
    expect(screen.getByText(longName)).toBeTruthy();
  });

  it('handles extremely long messages without crashing', () => {
    const longMessage = 'B'.repeat(500);
    render(<ChatRow name="Test" photoURL={null} lastMessage={longMessage} onPress={() => {}} />);
    expect(screen.getByText(longMessage)).toBeTruthy();
  });

  it('handles complex emoji messages without crashing', () => {
    const emojiMessage = '🎉🔥💯🚀❤️🎊✨🌟'.repeat(10);
    render(<ChatRow name="Test" photoURL={null} lastMessage={emojiMessage} onPress={() => {}} />);
    expect(screen.getByText(emojiMessage)).toBeTruthy();
  });
});
