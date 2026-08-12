import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Avatar } from './Avatar';

export interface ConfirmSheetRef {
  open: (options: ConfirmSheetOptions) => void;
  close: () => void;
}

export interface ConfirmSheetOptions {
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  thirdText?: string;
  confirmColor?: 'destructive' | 'primary';
  thirdColor?: 'destructive' | 'primary';
  avatar?: { uri?: string | null; name: string };
  onConfirm: () => void;
  onThirdAction?: () => void;
}

export const ConfirmSheet = forwardRef<ConfirmSheetRef>((_, ref) => {
  const { colors, isDark } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [options, setOptions] = React.useState<ConfirmSheetOptions | null>(null);

  useImperativeHandle(ref, () => ({
    open: (opts) => {
      setOptions(opts);
      bottomSheetRef.current?.expand();
    },
    close: () => {
      bottomSheetRef.current?.close();
    },
  }));

  const handleConfirm = () => {
    options?.onConfirm();
    bottomSheetRef.current?.close();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['40%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.background, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.6} />
      )}
      onClose={() => setOptions(null)}
    >
      <BottomSheetView style={styles.contentContainer}>
        {options?.avatar && (
          <View style={styles.avatarContainer}>
            <Avatar uri={options.avatar.uri} name={options.avatar.name} size={64} />
          </View>
        )}
        <AppText weight="bold" style={[styles.title, { color: colors.foreground }]}>
          {options?.title}
        </AppText>
        <AppText style={[styles.description, { color: colors.mutedForeground }]}>
          {options?.description}
        </AppText>

        <View style={options?.thirdText ? styles.columnButtonContainer : styles.buttonContainer}>
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: options?.confirmColor === 'destructive' ? '#ef4444' : colors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <AppText weight="bold" style={{ color: '#fff' }}>
              {options?.confirmText}
            </AppText>
          </Pressable>

          {options?.thirdText && (
            <Pressable
              onPress={() => {
                options?.onThirdAction?.();
                bottomSheetRef.current?.close();
              }}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: options?.thirdColor === 'destructive' ? '#ef4444' : colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <AppText weight="bold" style={{ color: '#fff' }}>
                {options.thirdText}
              </AppText>
            </Pressable>
          )}

          <Pressable
            onPress={() => bottomSheetRef.current?.close()}
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              { backgroundColor: isDark ? '#27272a' : '#f4f4f5' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <AppText weight="semibold" style={{ color: colors.foreground }}>
              {options?.cancelText || 'Cancel'}
            </AppText>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  columnButtonContainer: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
