import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type AppIconButtonVariant = 'soft' | 'solid' | 'ghost';

type AppIconButtonProps = {
  iconName: IoniconName;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  variant?: AppIconButtonVariant;
  style?: ViewStyle;
};

export function AppIconButton({
  iconName,
  onPress,
  size = 20,
  disabled = false,
  variant = 'soft',
  style,
}: AppIconButtonProps) {
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  const variantStyle =
    variant === 'solid'
      ? {
          backgroundColor: palette.accent,
          borderColor: palette.accent,
          iconColor: '#FFFFFF',
        }
      : variant === 'ghost'
        ? {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            iconColor: palette.textSecondary,
          }
        : {
            backgroundColor: isDark ? '#223956' : '#E8F2FF',
            borderColor: isDark ? '#304D73' : '#D2E4FF',
            iconColor: isDark ? '#BFD9FF' : '#1F7AE0',
          };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
        },
        style,
      ]}>
      <Ionicons name={iconName} size={size} color={variantStyle.iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
