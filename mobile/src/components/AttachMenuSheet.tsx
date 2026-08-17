import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Image as ImageIcon, FileText, Microphone } from 'phosphor-react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface AttachMenuSheetRef {
  open: () => void;
  close: () => void;
}

interface AttachMenuSheetProps {
  onPickImage: () => void;
  onPickFile: () => void;
  onRecordVoice: () => void;
}

export const AttachMenuSheet = forwardRef<AttachMenuSheetRef, AttachMenuSheetProps>(
  ({ onPickImage, onPickFile, onRecordVoice }, ref) => {
    const { colors } = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.expand(),
      close: () => bottomSheetRef.current?.close(),
    }));

    const option = (Icon: typeof ImageIcon, label: string, onPress: () => void) => (
      <Pressable
        onPress={() => {
          bottomSheetRef.current?.close();
          onPress();
        }}
        style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <Icon size={24} color={colors.foreground} weight="fill" />
        </View>
        <AppText weight="semibold" style={{ fontSize: 13, color: colors.foreground, textAlign: 'center', marginTop: 8 }}>
          {label}
        </AppText>
      </Pressable>
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['30%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.background, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.6} />
        )}
      >
        <BottomSheetView style={styles.content}>
          <AppText weight="bold" style={[styles.title, { color: colors.foreground }]}>
            Attach
          </AppText>
          <View style={styles.grid}>
            {option(ImageIcon, 'Photo', onPickImage)}
            {option(FileText, 'File', onPickFile)}
            {option(Microphone, 'Voice note', onRecordVoice)}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { fontSize: 18, marginBottom: 20, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingHorizontal: 10 },
  option: { alignItems: 'center', width: 80 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
