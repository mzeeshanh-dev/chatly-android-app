import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** Lets code outside the component tree (push notification handlers) trigger navigation. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
