import React from 'react';
import { Check, Checks, Clock } from 'phosphor-react-native';
import { sharedColors } from '../theme/tokens';

/** Pending = clock (queued locally, not yet on the server), sent = single gray check, delivered = double gray check, read = double green check. */
export function TickIcon({ status }: { status?: 'pending' | 'sent' | 'delivered' | 'read' }) {
  if (status === 'pending') return <Clock size={12} weight="bold" color={sharedColors.tickSent} />;
  if (!status || status === 'sent') return <Check size={13} weight="bold" color={sharedColors.tickSent} />;
  const color = status === 'read' ? sharedColors.tickRead : sharedColors.tickSent;
  return <Checks size={15} weight="bold" color={color} />;
}
