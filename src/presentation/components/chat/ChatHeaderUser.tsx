import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserProfile } from '@/src/features/users/services/userService';
import { UserAvatar } from '@/src/presentation/components/ui/UserAvatar';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { typography } from '@/src/presentation/theme/typography';

type ChatHeaderUserProps = {
  name: string;
  availabilityLabel: string;
  profile: UserProfile | null;
  onPress: () => void;
};

export function ChatHeaderUser({ name, availabilityLabel, profile, onPress }: ChatHeaderUserProps) {
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  return (
    <Pressable style={styles.wrap} onPress={onPress} hitSlop={8}>
      <UserAvatar uri={profile?.photoURL} fallbackInitial={name} size={40} />
      <View style={styles.meta}>
        <Text style={[styles.name, typography.heading, { color: palette.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.subtitle, typography.caption, { color: profile?.online ? '#14A44D' : palette.textSecondary }]} numberOfLines={1}>
          {availabilityLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flex: 1 },
  name: { fontSize: 17 },
  subtitle: { fontSize: 12 },
});
