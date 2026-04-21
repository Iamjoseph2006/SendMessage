import { Image, StyleSheet, Text, View } from 'react-native';
import { getAvatarInitials } from '@/src/shared/utils/avatar';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

type UserAvatarProps = {
  uri?: string | null;
  fallbackInitial?: string | null;
  size?: number;
};

export function UserAvatar({ uri, fallbackInitial, size = 40 }: UserAvatarProps) {
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const initials = getAvatarInitials(fallbackInitial);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDark ? '#243B59' : '#E8F2FF',
          borderColor: isDark ? '#365277' : '#CFE2FF',
        },
      ]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
      ) : (
        <Text style={[styles.initials, { color: palette.accent, fontSize: Math.max(12, size * 0.38) }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '800',
  },
});
