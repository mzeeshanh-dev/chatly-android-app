import React from 'react';
import { View, Text, Pressable } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

describe('Sanity Check', () => {
  it('renders View and Text', () => {
    const tree = ReactTestRenderer.create(<View><Text>Hello</Text></View>).toJSON();
    expect(tree).toBeTruthy();
  });
  
  it('renders Pressable', () => {
    const tree = ReactTestRenderer.create(<Pressable><Text>Hi</Text></Pressable>).toJSON();
    expect(tree).toBeTruthy();
  });
});
