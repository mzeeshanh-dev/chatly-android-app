import React, { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  secureToggle?: boolean;
}

export function TextField({ label, error, icon, secureToggle, secureTextEntry, style, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <AppText weight="medium" style={{ fontSize: 13, marginBottom: 6 }} muted>
          {label}
        </AppText>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.input,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: focused ? colors.ring : 'transparent',
          paddingHorizontal: 14,
        }}
      >
        {icon ? <View style={{ marginRight: 10 }}>{icon}</View> : null}
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.mutedForeground}
          style={[
            { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.foreground, fontFamily: 'Inter-Regular' },
            style,
          ]}
        />
        {secureToggle ? (
          <View
            onTouchEnd={() => setHidden((h) => !h)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {hidden ? <EyeSlash size={19} color={colors.mutedForeground} /> : <Eye size={19} color={colors.mutedForeground} />}
          </View>
        ) : null}
      </View>
      {error ? (
        <AppText style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{error}</AppText>
      ) : null}
    </View>
  );
}
